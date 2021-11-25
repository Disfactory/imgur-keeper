import fetch from 'node-fetch'
import fs from 'fs'
import { basename, join } from 'path'
import { subDays } from 'date-fns'
import pMap from 'p-map'
import dotenv from 'dotenv'
import Knex from 'knex'

dotenv.config()

const { DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME, DAYS_BEFORE = 30 } = process.env

const getImgurImage = async (url) => {
  return fetch(url).then((res) => res.buffer())
}

(async () => {
  const knex = Knex({
    client: 'pg',
    connection: {
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT,
      database: DB_NAME,
    },
  })

  const oneMonthBefore = subDays(new Date(), DAYS_BEFORE)

  // e.g.
  // const recentImages = [
  //   { image_path: 'https://i.imgur.com/jTzXabR.jpg', factory_id: '123' },
  // ]
  const recentImages = await knex('api_image')
    .select('image_path', 'factory_id')
    .where('created_at', '>=', oneMonthBefore)

  await pMap(
    recentImages,
    async (image) => {
      const filename = `factory-${image.factory_id}-imgur-${basename(image.image_path)}`
      const filePath = join('images', filename)

      if (!fs.existsSync(filePath)) {
        const imgur = await getImgurImage(image.image_path)

        fs.writeFileSync(filePath, imgur)
        console.log(`Saved - ${filePath}`)
      }
    },
    { concurrency: 6 }
  )

  console.log('✨ Success')
  await knex.destroy()
})()
