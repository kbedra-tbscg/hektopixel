const fs = require('fs')

const animationsDir = 'animations'

async function getAnimationFiles() {
  try {
    return await fs.promises.readdir(animationsDir)
  } catch (err) {
    console.error('Error occurred while reading directory!', err)
  }
  return []
}

function getStream() {
  const timestamp = Date.now()
  return fs.createWriteStream(`${animationsDir}/${timestamp}.dat`, { flags: 'a' })
}

function readFileStream(filename) {
  return fs.createReadStream(`${animationsDir}/${filename}`, { highWaterMark: 900 })
}

module.exports = { getAnimationFiles, getStream, readFileStream }
