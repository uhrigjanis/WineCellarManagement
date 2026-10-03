function readFile(file, method) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result === null) {
        reject(new Error('The file could not be read.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(reader.error || new Error('The file could not be read.'));
    reader.onabort = () => reject(new Error('The file read was aborted.'));
    reader[method](file);
  });
}

export function readFileAsText(file) {
  return readFile(file, 'readAsText');
}

export function readFileAsArrayBuffer(file) {
  return readFile(file, 'readAsArrayBuffer');
}
