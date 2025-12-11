export const theme = {
  // PUBLIC_INTERFACE
  colors: {
    /** Ocean Professional palette */
    primary: '#2563EB',
    secondary: '#F59E0B',
    success: '#F59E0B',
    error: '#EF4444',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
  },
  // PUBLIC_INTERFACE
  logLevel: process.env.REACT_APP_LOG_LEVEL || 'info',
  nodeEnv: process.env.REACT_APP_NODE_ENV || 'development',
};

// PUBLIC_INTERFACE
export function log(level, ...args) {
  const lv = (theme.logLevel || 'info').toLowerCase();
  const order = ['error', 'warn', 'info', 'debug', 'trace'];
  const idx = order.indexOf(level);
  const minIdx = order.indexOf(lv === 'silent' ? 'zzz' : lv);
  if (idx === -1 || (minIdx !== -1 && idx > minIdx)) return;
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log']('[job-board]', ...args);
}
