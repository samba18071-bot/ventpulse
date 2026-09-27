import { server } from '../src/server.js'

// Vercel's Node runtime accepts the standard Node HTTP request/response pair.
export default function handler(req, res) {
  return server.emit('request', req, res)
}
