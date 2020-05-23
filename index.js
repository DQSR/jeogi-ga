const Koa = require('koa');
const Router = require('@koa/router');
const koaBody = require('koa-body');
const logger = require('koa-logger');

const url = require('url');

const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');

const adapter = new FileAsync('data/db.json');
let db = null;

low(adapter).then(_db => {
  _db.defaults({ urls: [] })
    .write();
  db = _db
})

const app = new Koa();
const router = new Router();

function generateID() {
  let id = '';
  const length = Math.floor(Math.random() * 5) + 2;
  for (let i = 0; i < length; i++) {
    let code = Math.floor(Math.random() * (55203 - 44032)) + 44032;
    let lastChar = (code - 0xAC00) % (21 * 28) % 28;
    code = code - lastChar;
    id += String.fromCharCode(code);
  } 
  return id;
}

function generateUUID() {
  let uuid = generateID();
  if (db.get('urls').find({ id: uuid }).value())
    uuid = generateUUID();
  return uuid;
}



router
  .get('/:id', ctx => {
    const urlID = ctx.params.id;
    const data = db.get('urls').find({ id: urlID }).value();
    if (!data) return ctx.status = 404;
    ctx.redirect(data.url);
  })
  .post('/', koaBody(), async ctx => {
    const reqUrl = ctx.request.body.url;

    if (!reqUrl) return ctx.status = 400;

    if (url.parse(reqUrl).protocol !== 'https:') return ctx.status = 400

    const urlID = generateUUID();

    await db.get('urls')
      .push({
        id: urlID,
        url: reqUrl
      })
      .write()
      .then(() => {
        ctx.body = urlID;
      })
      .catch((e) => {
        ctx.status = 500;
        console.error(e);
      })
    console.log(`  \x1b[90m---\x1b[0m \x1b[1mNEW\x1b[0m\x1b[90m ${urlID} ${reqUrl}\x1b[0m`)
  })

app.use(logger());

app
  .use(router.routes())
  .use(router.allowedMethods());

app.use(require('koa-static')('public'));

app.listen(3000);
console.log('Server is Running')