// أرقام إنجليزي + ص/م بالعربي، مثال: 3:40 م
export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' })
