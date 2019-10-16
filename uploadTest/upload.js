const express = require('express')
const app = express()
const fs = require('fs-extra')
const path = require('path')
const concat = require('concat-files')
const formidable = require('formidable')

const uploadDir = 'resource/upload'

// 处理静态资源
app.use(express.static(path.join(__dirname)))

// 处理跨域
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Content-Length, Authorization, Accept, X-Requested-With'
  )
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS')
  res.header('X-Powered-By', ' 3.2.1')
  if (req.method == 'OPTIONS') res.send(200) /*让options请求快速返回*/
  else next()
})

app.get('/check/file', (req, res) => {
  let fileName = req.query.fileName
  let fileMD5 = req.query.fileMD5
  // 获取文件chunk列表
  getChunksList(
    path.join(uploadDir, fileName),
    path.join(uploadDir, fileMD5),
    data => {
      res.send(data)
    }
  )
})

app.all('/upload', (req, res) => {
  let form = new formidable.IncomingForm({
    uploadDir: 'resource/upload'
  })
  form.parse(req, (err, fields, file) => {
    let result = {}
    let folder = fields.folder
    let fileMD5 = fields.fileMD5
    let folderPath = path.resolve(__dirname, uploadDir, fileMD5)
    folderIsExit(folderPath).then(() => {
      let destFilePath = path.resolve(folderPath, folder)
      fs.rename(file.chunk.path, destFilePath, err => {
        if (err) {
          result = {
            code: 0,
            desc: '文件上传失败'
          }
        } else {
          console.log("文件:" + destFilePath + ",上传成功")
          result = {
            code: 1,
            desc: '文件上传成功'
          }
        }
        res.send(result)
      })
    })
  })
})

app.get('/merge', async (req, res) => {
  let fileMD5 = req.query.md5
  let fileName = req.query.fileName
  let srcPath = path.join(uploadDir, fileMD5)
  let fileArr = await listDir(srcPath)
  for(let i = 0; i < fileArr.length; i++) {
    fileArr[i] = srcPath + '/' + fileArr[i]
  }
  concat(fileArr, path.join(uploadDir, fileName), () => {
    console.log('Merge success!')
  })
})

/**
 * @description 文件夹是否存在, 不存在则创建文件
 * @param {String} folder 文件夹
 */
function folderIsExit(folder) {
  return new Promise(async (resolve, reject) => {
    await fs.ensureDirSync(path.join(folder))
    resolve(true)
  })
}

/**
 * @description 获取文件chunk列表
 * @param {String} filePath 文件路径
 * @param {String} folderPath 文件夹路径
 * @param {Function} callback 回调函数
 */
async function getChunksList(filePath, folderPath, callback) {
  let isFileExist = await isExist(filePath)
  let result = {}
  if (isFileExist) {
    // 文件已存在，不需要上传
    result = {
      code: 1,
      file: {
        isExist: true,
        name: filePath
      },
      desc: 'file is exist'
    }
  } else {
    // 文件不存在，返回文件块列表
    let isFolderExist = await isExist(folderPath)
    let chunkList = []
    if (isFolderExist) {
      chunkList = await listDir(folderPath)
    }
    result = {
      code: 1,
      chunkList :chunkList,
      desc: 'folder list'
    }
  }
  callback(result)
}

/**
 * @description 判断文件或文件夹是否存在
 * @param {String} path 
 */
function isExist(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err && err.code === 'ENOENT') {
        resolve(false)
      } else {
        resolve(true)
      }
    })
  })
}

/**
 * @description 列出文件夹下所有文件
 * @param {String} path 
 */
function listDir(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err)
        return 
      }
      // 把mac系统下的临时文件去掉
      if (files && files.length > 0 && files[0] === '.DS_Store') {
        files.splice(0, 1)
      }
      resolve(files)
    })
  })
}

app.listen(8888, () => {
  console.log('服务启动完成，端口监听8888！')
})