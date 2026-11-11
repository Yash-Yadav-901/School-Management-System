// Logs are silenced during tests via LOG_SILENT=true so test output stays clean.
const silent = process.env.LOG_SILENT === 'true';

function stamp(level) {
  return `${new Date().toISOString()} [${level}]`;
}

export const logger = {
  info(msg) {
    if (!silent) console.log(`${stamp('INFO')} ${msg}`);
  },
  warn(msg) {
    if (!silent) console.warn(`${stamp('WARN')} ${msg}`);
  },
  error(msg, err) {
    if (!silent) {
      console.error(`${stamp('ERROR')} ${msg}`);
      if (err) console.error(err);
    }
  },
};
