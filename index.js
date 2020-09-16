const fetch = require('node-fetch')
const Promise = require('bluebird')
const fs = require('fs')
const { basename, join } = require('path')
const { differenceInMonths } = require('date-fns')
const writeFile = Promise.promisify(fs.writeFile)

const getImgurImage = async (url) => {
  return fetch(url).then((res) => res.buffer())
}

(async () => {
  console.log('Read lastResult file........');
  const rawLastResult = JSON.parse(fs.readFileSync(join(__dirname, 'lastResult.json')))

  const lastResult = rawLastResult
    .filter((data) => differenceInMonths(new Date(data.update_at), Date.now()) <= 5)
    .map((data) => data.name)

  console.log('Read imgur.txt......')
  const images = fs.readFileSync(join(__dirname, 'imgur.txt'), 'utf-8').split('\n').filter((el) => el.length > 0)

  const inputs = images.filter((image) => !lastResult.includes(basename(image)))
  console.log(`There are valid ${lastResult.length} files, and need to update ${inputs.length}`)

  const finished = []
  await Promise.map(
    inputs,
    (url) => {
      return getImgurImage(url).then((el) => writeFile(join('output', basename(url)), el)).then(() => {
        console.log(`Saved - ${join('output', basename(url))}`)
        finished.push({ name: basename(url), update_at: Date.now() })
      })
    },
    { concurrency: 6 }
  )

  fs.writeFileSync(join(__dirname, 'lastResult.json'), JSON.stringify(rawLastResult.concat(finished)))
  console.log('✨ Success')
})()
