import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchWinesFromServer,
  isCloudConfigured,
  saveWineChanges,
  signIn as cloudSignIn,
  signOut as cloudSignOut,
  watchUser,
  watchWines,
} from './cloudStore.js';
import {
  diffWines,
  getWineSize,
  isValidDocId,
  keepWineOrder,
  MAX_WINE_BYTES,
  planMigration,
} from './wineSync.js';

export const STORAGE_KEY = 'weinkeller-wines-v2';

const IGNORED_SIGN_IN_ERRORS = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

export function readLocalWines() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalWines(wines) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wines));
    return true;
  } catch {
    return false;
  }
}

const fitsInCloud = (wine) => isValidDocId(wine.id) && getWineSize(wine) <= MAX_WINE_BYTES;

const getSyncStatus = ({ pending, fromCache }) => {
  if (fromCache && typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (pending) return 'pending';
  return fromCache ? 'connecting' : 'synced';
};

// Signed out: wines live in localStorage on this device.
// Signed in: wines live in Firestore (with an offline copy in IndexedDB); local wines are uploaded once.
export function useWineStorage(createId) {
  const [wines, setWines] = useState(readLocalWines);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(isCloudConfigured ? 'connecting' : 'local');
  const [notice, setNotice] = useState(null);
  const userRef = useRef(null);
  const winesRef = useRef(wines);
  const remoteRef = useRef(null);
  const createIdRef = useRef(createId);
  const uid = user?.uid;

  winesRef.current = wines;
  createIdRef.current = createId;

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isCloudConfigured) return undefined;
    let active = true;
    let unsubscribe = () => {};

    watchUser((nextUser) => {
      const wasSignedIn = Boolean(userRef.current);
      userRef.current = nextUser;
      setUser(nextUser);
      if (!nextUser) {
        setStatus('local');
        if (wasSignedIn) setWines(readLocalWines());
      }
    })
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch(() => {
        if (!active) return;
        setStatus('local');
        setNotice({ kind: 'error', code: 'unavailable' });
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!uid) return undefined;
    let active = true;
    let unsubscribe = () => {};

    remoteRef.current = null;
    setWines([]);
    setStatus('connecting');

    watchWines(
      uid,
      (update) => {
        if (!active) return;
        if (update.changed || remoteRef.current === null) {
          const ordered = keepWineOrder(winesRef.current, update.wines);
          remoteRef.current = ordered;
          setWines(ordered);
        }
        setStatus(getSyncStatus(update));
      },
      () => {
        if (!active) return;
        setStatus('error');
        setNotice({ kind: 'error', code: 'load-failed' });
      },
    )
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    // Upload wines that were saved on this device before signing in.
    const localWines = readLocalWines();
    if (localWines.length) {
      fetchWinesFromServer(uid)
        .then(async (cloudWines) => {
          const planned = planMigration(localWines, cloudWines, () => createIdRef.current());
          const uploads = planned.filter(fitsInCloud);
          const keptLocally = planned.filter((wine) => !fitsInCloud(wine));
          await saveWineChanges(uid, { upserts: uploads });
          writeLocalWines(keptLocally);
          if (active && planned.length) {
            setNotice({ kind: keptLocally.length ? 'error' : 'success', code: 'migrated', count: uploads.length, skipped: keptLocally.length });
          }
        })
        .catch(() => {
          if (active) setNotice({ kind: 'error', code: 'migration-failed' });
        });
    }

    return () => {
      active = false;
      unsubscribe();
      remoteRef.current = null;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      if (!writeLocalWines(wines)) {
        setNotice({ kind: 'error', code: 'local-full' });
      }
      return;
    }

    const remote = remoteRef.current;
    if (!remote) return;
    const changes = diffWines(remote, wines);
    if (!changes.upserts.length && !changes.deletes.length) return;

    const rejected = changes.upserts.find((wine) => !fitsInCloud(wine));
    if (rejected) {
      setNotice({ kind: 'error', code: 'too-large' });
      setWines(remote);
      return;
    }

    remoteRef.current = wines;
    setStatus('pending');
    // If the server rejects the write, Firestore rolls back its cache and the listener restores the last saved state.
    saveWineChanges(uid, changes).catch(() => {
      setNotice({ kind: 'error', code: 'save-failed' });
    });
  }, [wines, uid]);

  const signIn = useCallback(async () => {
    try {
      await cloudSignIn();
    } catch (error) {
      if (IGNORED_SIGN_IN_ERRORS.has(error?.code)) return;
      setNotice({ kind: 'error', code: error?.code === 'auth/unauthorized-domain' ? 'unauthorized-domain' : 'sign-in-failed' });
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await cloudSignOut();
    } catch {
      setNotice({ kind: 'error', code: 'sign-out-failed' });
    }
  }, []);

  return {
    wines,
    setWines,
    cloud: {
      configured: isCloudConfigured,
      user,
      status,
      notice,
      clearNotice: () => setNotice(null),
      signIn,
      signOut,
    },
  };
}
