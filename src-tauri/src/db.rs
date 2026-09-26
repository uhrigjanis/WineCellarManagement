use rusqlite::{params, Connection};
use serde_json::Value;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

const LEGACY_IMPORT_MARKER: &str = "legacy-local-storage-import-v2";

fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|error| error.to_string())?;
    Ok(app_data_dir.join("wine-cellar.db"))
}

fn open_database(app: &AppHandle) -> Result<Connection, String> {
    let connection = Connection::open(database_path(app)?).map_err(|error| error.to_string())?;
    ensure_schema(&connection).map_err(|error| error.to_string())?;
    Ok(connection)
}

fn ensure_schema(connection: &Connection) -> rusqlite::Result<()> {
    connection.execute_batch(
        "CREATE TABLE IF NOT EXISTS wines (
            id TEXT PRIMARY KEY NOT NULL,
            payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS wine_cellar_metadata (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );",
    )
}

fn insert_wines(connection: &Connection, wines: &[Value]) -> Result<(), String> {
    for wine in wines {
        let id = wine
            .get("id")
            .and_then(Value::as_str)
            .filter(|id| !id.trim().is_empty())
            .ok_or_else(|| "Every wine must have a stable string ID.".to_string())?;
        let payload = serde_json::to_string(wine).map_err(|error| error.to_string())?;
        connection
            .execute(
                "INSERT INTO wines (id, payload) VALUES (?1, ?2)",
                params![id, payload],
            )
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn migrate_legacy_data(
    connection: &mut Connection,
    legacy_wines: Option<Vec<Value>>,
) -> Result<(), String> {
    ensure_schema(connection).map_err(|error| error.to_string())?;
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    let already_migrated: bool = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM wine_cellar_metadata WHERE key = ?1)",
            [LEGACY_IMPORT_MARKER],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;

    if !already_migrated {
        if let Some(wines) = legacy_wines {
            insert_wines(&transaction, &wines)?;
        }
        transaction
            .execute(
                "INSERT INTO wine_cellar_metadata (key, value) VALUES (?1, 'complete')",
                [LEGACY_IMPORT_MARKER],
            )
            .map_err(|error| error.to_string())?;
    }
    transaction.commit().map_err(|error| error.to_string())
}

fn load_wines_from(connection: &Connection) -> Result<Vec<Value>, String> {
    let mut statement = connection
        .prepare("SELECT id, payload FROM wines ORDER BY rowid")
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| error.to_string())?;

    let mut wines = Vec::new();
    for row in rows {
        let (id, payload) = row.map_err(|error| error.to_string())?;
        let wine: Value = serde_json::from_str(&payload).map_err(|error| error.to_string())?;
        if wine.get("id").and_then(Value::as_str) != Some(id.as_str()) {
            return Err(format!("Stored wine \"{id}\" has inconsistent identity data."));
        }
        wines.push(wine);
    }
    Ok(wines)
}

fn replace_wines(connection: &mut Connection, wines: &[Value]) -> Result<(), String> {
    let transaction = connection.transaction().map_err(|error| error.to_string())?;
    transaction
        .execute("DELETE FROM wines", [])
        .map_err(|error| error.to_string())?;
    insert_wines(&transaction, wines)?;
    transaction.commit().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn initialize_wine_storage(
    app: AppHandle,
    legacy_wines: Option<Vec<Value>>,
) -> Result<(), String> {
    let mut connection = open_database(&app)?;
    migrate_legacy_data(&mut connection, legacy_wines)
}

#[tauri::command]
pub fn load_wines(app: AppHandle) -> Result<Vec<Value>, String> {
    let connection = open_database(&app)?;
    load_wines_from(&connection)
}

#[tauri::command]
pub fn save_wines(app: AppHandle, wines: Vec<Value>) -> Result<(), String> {
    let mut connection = open_database(&app)?;
    replace_wines(&mut connection, &wines)
}

#[cfg(test)]
mod tests {
    use super::{load_wines_from, migrate_legacy_data, replace_wines};
    use rusqlite::Connection;
    use serde_json::json;

    fn open_test_database() -> Connection {
        let connection = Connection::open_in_memory().unwrap();
        super::ensure_schema(&connection).unwrap();
        connection
    }

    #[test]
    fn persists_records_and_migrates_legacy_data_only_once() {
        let mut connection = open_test_database();
        let first = json!({"id": "wine-1", "name": "First"});
        let later = json!({"id": "wine-2", "name": "Later"});

        migrate_legacy_data(&mut connection, Some(vec![first.clone()])).unwrap();
        migrate_legacy_data(&mut connection, Some(vec![later])).unwrap();

        assert_eq!(load_wines_from(&connection).unwrap(), vec![first]);
    }

    #[test]
    fn rolls_back_failed_replacements_without_losing_existing_records() {
        let mut connection = open_test_database();
        let saved = json!({"id": "wine-1", "name": "Saved"});
        replace_wines(&mut connection, &[saved.clone()]).unwrap();

        let result = replace_wines(
            &mut connection,
            &[json!({"id": "wine-2"}), json!({"name": "Missing ID"})],
        );

        assert!(result.is_err());
        assert_eq!(load_wines_from(&connection).unwrap(), vec![saved]);
    }
}
