// Staging webhook receiver: Fooify calls back here after order events.
const http = require('http')
http.createServer((req, res) => {
  let b = ''
  req.on('data', c => b += c)
  req.on('end', () => { console.log('webhook:', req.url, b); res.end('ok') })
}).listen(8787)
