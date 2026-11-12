// side-comment：画面の端に縦長に置く、アイコンとコメントだけのコメント表示（わんコメ用テンプレート）
// 見た目は config.js（設定ページでダウンロードすると入る）で変える。URLパラメータを付けて開いたときはそちらを優先する。どちらもなければ既定値
//   size=24      文字の大きさ(px)
//   cols=15      1行の文字数（全角。半角は2文字で全角1文字分）
//   lines=3      これより長いコメントは省略
//   accent=ffffff ラインの色（#なしの16進）
//   bg=65        背景の黒の濃さ(0〜100)
//   side=left    寄せる側（left / right）
//   newest=bottom 新しいコメントを出す位置（bottom：下に出して上へ積む / top：上に出して下へ積む）
//   font=udev    udev（同梱のUDEV Gothic・等幅） / bizud（BIZ UDゴシック・等幅） / sans（游ゴシックなど・等幅でない）
//   icon=1       0でアイコンを出さない
//   name=1       コメントの上に名前を1行出す（長い名前は省略）。0で出さない
//   namescale=60 名前の大きさ（コメントの文字に対する%）
//   namecolor=white 名前の色。white（白） / accent（ラインと同じ色。明るい画面では読みにくい色がある）
//   life=0       コメントを消すまでの秒数（0は消さない）
//   max=12       同時に出す件数
//   demo=1       ダミーコメントで確認（all で全部一度に出す）
const params = new URLSearchParams()
for (const [k, v] of Object.entries(window.SIDE_COMMENT_CONFIG || {})) params.set(k, String(v))
for (const [k, v] of new URLSearchParams(location.search)) params.set(k, v)

function num(name, def, min, max) {
  const v = Number(params.get(name))
  if (!params.has(name) || Number.isNaN(v)) return def
  return Math.min(max, Math.max(min, v))
}
function pick(name, def, choices) {
  const v = params.get(name)
  return choices.includes(v) ? v : def
}

const SIZE = num('size', 24, 10, 80)
const COLS = num('cols', 15, 3, 40)
const LINES = Math.round(num('lines', 3, 1, 20))
const BG = num('bg', 65, 0, 100)
const accentParam = params.get('accent') || ''
const ACCENT = /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentParam) ? '#' + accentParam : '#ffffff'
const SIDE = pick('side', 'left', ['left', 'right'])
const NEWEST = pick('newest', 'bottom', ['bottom', 'top'])
const FONT = pick('font', 'udev', ['udev', 'bizud', 'sans'])
const SHOW_ICON = params.get('icon') !== '0'
const SHOW_NAME = params.get('name') !== '0'
const NAME_SCALE = num('namescale', 60, 30, 100)
const NAME_COLOR = pick('namecolor', 'white', ['white', 'accent'])
const LIFE_SEC = num('life', 0, 0, 3600)
const LIFE_MS = LIFE_SEC > 0 ? LIFE_SEC * 1000 : Infinity
const MAX = Math.round(num('max', 12, 1, 50))

const FONTS = {
  udev: '"Side Comment UDEV", "BIZ UDGothic", "BIZ UDゴシック", monospace',
  bizud: '"BIZ UDGothic", "BIZ UDゴシック", monospace',
  sans: '"Noto Sans JP", "Yu Gothic UI", "Yu Gothic", "Hiragino Sans", sans-serif',
}

const root = document.documentElement
root.style.setProperty('--font', SIZE + 'px')
root.style.setProperty('--avatar', Math.round(SIZE * 4 / 3) + 'px')
root.style.setProperty('--cols', COLS)
root.style.setProperty('--lines', LINES)
root.style.setProperty('--bg-alpha', BG / 100)
root.style.setProperty('--accent', ACCENT)
root.style.setProperty('--comment-font', FONTS[FONT])
root.style.setProperty('--name-font', Math.round(SIZE * NAME_SCALE / 100) + 'px')
root.style.setProperty('--name-color', NAME_COLOR === 'accent' ? ACCENT : '#ffffff')
root.classList.add('side-' + SIDE)
root.classList.add('newest-' + NEWEST)
if (SHOW_NAME) root.classList.add('has-name')

// 読み込み時に届く過去分のうち、これより古いもの（前の配信の分など）は出さない
const LOADED_AT = Date.now()
const HISTORY_MS = 60 * 60 * 1000

// 投稿時刻が読めないコメントは、受け取った時刻を基準にする
const firstSeen = new Map()
function ageMs(comment, now) {
  const posted = Date.parse(comment.data.timestamp)
  if (!Number.isNaN(posted)) return now - posted
  if (!firstSeen.has(comment.data.id)) firstSeen.set(comment.data.id, now)
  return now - firstSeen.get(comment.data.id)
}

// 確認用のダミー。アイコンは色付きの四角
function demoComments() {
  const icon = (color) =>
    'data:image/svg+xml,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="${color}"/></svg>`)
  const rows = [
    ['#7a8ca8', 'よる', 'こんばんは'],
    ['#8c7aa8', 'とても長い名前のリスナーさんの表示確認用', '長いコメントのときの折り返しと省略を確認するためのダミーです。長いコメントのときの折り返しと省略を確認するためのダミーです。長いコメントのときの折り返しと省略を確認するためのダミーです。'],
    ['#a87a8c', 'nightwalker_2026', 'ナイス！'],
    ['#7aa88c', '回避の練習中の人', '今の回避すごい'],
    ['#a89a7a', 'Tomo', 'Good game! 88888'],
    ['#7aa8a8', 'しろくま', 'おつかれさまです'],
  ]
  return rows.map(([color, name, text], i) => ({
    data: { id: 'demo' + i, timestamp: new Date().toISOString(), profileImage: icon(color), name, displayName: name, comment: text },
  }))
}

// VueとOneSDKは templates/custom/__origin/ にある。わんコメのURLでも、ローカルファイル指定（テンプレート画面からOBSへドラッグ）でも読める。
// 読めないのは templates/custom/ の外に置いたときだけ。そのときはダミーを流さず案内を出す（配信にダミーが出ないように）。
// 設定ページのプレビューは demo=1 を付けて開くのでダミーで動く
const HAS_SDK = typeof OneSDK !== 'undefined'
const DEMO = params.has('demo')
if (!HAS_SDK && !DEMO) {
  document.body.removeAttribute('hidden')
  document.body.innerHTML =
    '<div class="setup-error">side-comment：コメントを受け取れません。<br>' +
    'side-comment フォルダを %APPDATA%\\onecomme\\templates\\custom\\ に入れて、<br>' +
    'URL http://localhost:11180/templates/custom/side-comment/ で開いてください。</div>'
  throw new Error('side-comment: OneSDK not found')
}

const app = Vue.createApp({
  setup() {
    document.body.removeAttribute('hidden')
  },
  data() {
    return { comments: [], now: Date.now(), showIcon: SHOW_ICON, showName: SHOW_NAME }
  },
  computed: {
    // 前の配信の分と、本文のないコメント（金額だけのスパチャなど）は出さない
    // newest=top のときは新しい順に並べて、上に新しいコメントが出るようにする
    visible() {
      const list = this.comments
        .filter((c) => c.data.comment && ageMs(c, LOADED_AT) < HISTORY_MS && ageMs(c, this.now) < LIFE_MS)
        .slice(-MAX)
      return NEWEST === 'top' ? list.reverse() : list
    },
  },
  methods: {
    // 消えるコメントはabsoluteになる。位置を指定しないと下寄せで下端へ飛ぶので、今の位置に固定する
    pinLeaving(el) {
      el.style.top = `${el.offsetTop}px`
    },
  },
  mounted() {
    setInterval(() => { this.now = Date.now() }, 1000)
    if (DEMO) {
      const rows = demoComments()
      if (params.get('demo') === 'all') { this.comments = rows; return }
      // 1件ずつ流して、出る動きを見られるようにする
      let i = 0
      const push = () => {
        const row = rows[i++ % rows.length]
        this.comments = [...this.comments, { data: { ...row.data, id: 'demo' + i, timestamp: new Date().toISOString() } }].slice(-50)
        this.now = Date.now()
      }
      push()
      setInterval(push, 2000)
      return
    }
    OneSDK.setup({ permissions: OneSDK.usePermission([OneSDK.PERM.COMMENT]) })
    OneSDK.subscribe({
      action: 'comments',
      callback: (comments) => {
        this.comments = comments
        this.now = Date.now()
      },
    })
    OneSDK.connect()
  },
})

if (HAS_SDK && !DEMO) {
  OneSDK.ready().then(() => app.mount('#container'))
} else {
  app.mount('#container')
}
