const express = require('express')
const app = express()
const session = require('cookie-session')
const bodyParser = require('body-parser')
const csv = require('csv-parser')
const fs = require('fs')

app.set('view engine', 'ejs')
app.use(express.static(`${__dirname}/static`))
app.use(express.urlencoded({ extended: false }))

app.use(bodyParser.urlencoded({ extended: true }))

require('dotenv').config()

app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'pog',
  resave: true,
  saveUninitialized: true
}))

// const db = require('./db')
const playerData = {}
const playerList = {}

async function readCSV(playerData, playerList) {
  return new Promise(async function (resolve, reject) {
    const parseType = ['', 'int', '', '', 'int', 'float', 'float', 'int', 'int', 'int', 'int', 'int', 'float', 'float', 'float', 'float', 'dictionary', 'int', 'set', 'int', 'int', 'int', 'int', 'int', 'int', 'int', 'int']
    let lastUpdated = undefined
    let topRow = undefined
    fs.createReadStream('playerData.csv')
      .pipe(csv())
      .on('headers', (headers) => {
        topRow = headers
        lastUpdated = headers[0]
      })
      .on('data', (row) => {
        const rowData = Object.values(row)
        const playerID = parseInt(rowData[1])
        playerData[playerID] = {}
        playerData[playerID]['name'] = rowData[0]

        for (let i = 1; i < rowData.length-1; i++) {
          if (rowData[i] === 'undefined' || rowData[i] === 'N/A') {
            playerData[playerID][topRow[i]] = undefined
          }
          else if (parseType[i] === 'int') {
            playerData[playerID][topRow[i]] = parseInt(rowData[i])
          }
          else if (parseType[i] === 'float') {
            playerData[playerID][topRow[i]] = parseFloat(rowData[i])
          }
          else if (parseType[i] === 'set') {
            playerData[playerID][topRow[i]] = new Set(JSON.parse(rowData[i]))
          }
          else if (parseType[i] === 'dictionary') {
            const ratingDictionary = JSON.parse(rowData[i])
            playerData[playerID][topRow[i]] = {}
            for (const [year, rating] of Object.entries(ratingDictionary)) {
              playerData[playerID][topRow[i]][parseInt(year)] = parseFloat(rating)
            }
          }
          else {
            playerData[playerID][topRow[i]] = rowData[i]
          }
        }

        playerList[playerID] = {
          name: rowData[0],
          fullName: rowData[2],
          id: playerID,
        }
      })
      .on('end', () => {
        resolve(lastUpdated)
      })
  })
}

/* EJS Helper Functions */
app.locals.displayClue = function(clue) {
  if (clue[0] === 'team') {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        ${clue[1].substring(clue[1].indexOf('/')+1)}
      </div>
    `
  }
  else if (clue[0] === 'country') {
    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        ${clue[1]} nationality
      </div>
    `
  }
  else {
    let clueString = ''

    if (clue[0] === 'age') {
      clueString = `${clue[1]}+ years old`
    }
    else if (clue[0] === 'rating2') {
      clueString = `${clue[1]} career <b>rating 2.0</b>`
    }
    else if (clue[0] === 'rating1') {
      clueString = `${clue[1]} career <b>rating 1.0</b>`
    }
    else if (clue[0] === 'KDDiff') {
      clueString `${clue[1]}+ career K/D difference`
    }
    else if (clue[0] === 'maps') {
      clueString = `${clue[1]}+ maps played`
    }
    else if (clue[0] === 'rounds') {
      clueString = `${clue[1]}+ rounds played`
    }
    else if (clue[0] === 'KDRatio') {
      clueString = `${clue[1]}+ career K/D ratio`
    }
    else if (clue[0] === 'HSRatio') {
      clueString = `${clue[1]}%+ career headshot percentage`
    }
    else if (clue[0] === 'ratingTop20') {
      clueString = `${clue[1]}+ career <b>rating 2.0</b> against top 20 teams`
    }
    else if (clue[0] === 'clutchesTotal') {
      clueString = `${clue[1]}+ clutches won`
    }
    else if (clue[0] === 'majorsWon') {
      clueString = `${clue[1]}+ majors won`
    }
    else if (clue[0] === 'majorsPlayed') {
      clueString = `${clue[1]}+ majors played`
    }
    else if (clue[0] === 'LANsWon') {
      clueString = `${clue[1]}+ LANs won`
    }
    else if (clue[0] === 'LANsPlayed') {
      clueString = `${clue[1]}+ LANs played`
    }
    else if (clue[0] === 'top20s') {
      clueString = `${clue[1]}+ top 20 players of the year finishes`
    }
    else if (clue[0] === 'top10s') {
      clueString = `${clue[1]}+ top 10 players of the year finishes`
    }
    else if (clue[0] === 'ratingYear') {
      clueString = `${clue[1][1]}+ <b>rating 1.0</b> in ${clue[1][0]}`
    }
    else if (clue[0] === 'topPlacement') {
      clueString = `top ${clue[1]} player in at least one year`
    }
    else {
      clueString = `${clue[1]}+ career ${clue[0]}`
    }

    return `
      <div class="flex flex-col h-36 w-36 items-center justify-center text-center text-white">
        ${clueString}
      </div>
    `
  }
}

app.locals.getBorders = function(ind) {
  const BORDERS = ['border-r border-b', 'border-r border-b', 'border-b', 'border-r border-b', 'border-r border-b', 'border-b', 'border-r', 'border-r', '']
  return BORDERS[ind]
}

let puzzle = undefined
let puzzleDate = undefined

const NUMBER_OF_GUESSES = 9

const PUZZLES_GRID = [[0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [0, 5], [1, 5], [2, 5]]

async function start() {
  console.log('reading csv...')
  const lastUpdated = await readCSV(playerData, playerList)
  console.log(`Last updated: ${lastUpdated}`)
}

start()

function checkPlayerGrid(playerID, clue1, clue2) {
  const clue1Type = clue1[0]
  const clue1Val = clue1[1]
  const clue2Type = clue2[0]
  const clue2Val = clue2[1]
  let clue1Check = false
  let clue2Check = false

  if (clue1Type === 'team') {
    if (playerData[playerID]['teams'].has(clue1Val)) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'country') {
    if (playerData[playerID]['country'] === clue1Val) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'ratingYear') {
    if (playerData[playerID]['ratingYear'][clue1Val[0]] >= parseInt(clue1Val[1])) {
      clue1Check = true
    }
  }
  else if (clue1Type === 'topPlacement') {
    if (playerData[playerID]['topPlacement'][clue1Val[0]] <= parseInt(clue1Val[1])) {
      clue1Check = true
    }
  }
  else {
    if (playerData[playerID][clue1Type] >= parseInt(clue1Val)) {
      clue1Check = true
    }
  }

  if (clue2Type === 'team') {
    if (playerData[playerID]['teams'].has(clue2Val)) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'country') {
    if (playerData[playerID]['country'] === clue2Val) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'ratingYear') {
    if (playerData[playerID]['ratingYear'][clue2Val[0]] >= parseInt(clue2Val[1])) {
      clue2Check = true
    }
  }
  else if (clue2Type === 'topPlacement') {
    if (playerData[playerID]['topPlacement'][clue2Val[0]] <= parseInt(clue2Val[1])) {
      clue2Check = true
    }
  }
  else {
    if (playerData[playerID][clue2Type] >= parseInt(clue2Val)) {
      clue2Check = true
    }
  }

  return clue1Check && clue2Check
}

/* Middleware */
async function checkPuzzle(req, res, next) {
  // if past a time then update yada
  puzzle = [['team', '5974/CLG'], ['team', '9215/MIBR'], ['age', 20], ['team', '6673/NRG'], ['team', '5752/Cloud9'], ['team', '5973/Liquid']]
  next()
}

async function initPlayer(req, res, next) {
  if (req.session.player === undefined) {
    req.session.player = {
      start: new Date(),
      puzzle: puzzle,
      guessesLeft: NUMBER_OF_GUESSES,
      board: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
      guesses: [[], [], [], [], [], [], [], [], []],
      gameStatus: 0,
    }
    next()
  }
  else {
    if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
      req.session.player = {
        start: new Date(),
        puzzle: puzzle,
        guessesLeft: NUMBER_OF_GUESSES,
        board: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined],
        guesses: [[], [], [], [], [], [], [], [], []],
        gameStatus: 0,
      }
      next()
    }
    else {
      next()
    }
  }
}

function insertGuessHelper(req, res, next) {
  try {
    const ind = parseInt(req.body.index)
    const guess = parseInt(req.body.guess)

    if (req.session.player === undefined) {
      console.log('insert guess fail, no player')
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
      console.log('insert guess fail, puzzle incorrect', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.guessesLeft <= 0) {
      console.log('insert guess fail, no guesses left', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: 0,
        gameStatus: 0,
      }
      next()
    }
    else if (ind < 0 || ind >= 9) {
      console.log('insert guess fail, invalid index', ind)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.board === undefined) {
      console.log('insert guess fail, no board', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.board[ind] !== undefined && req.session.player.board[ind] !== null) {
      console.log(req.session.player.board[ind])
      console.log('insert guess fail, index already guessed', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.guesses === undefined) {
      console.log('insert guess fail, no guesses array', req.session.player)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (playerData[guess] === undefined) {
      console.log('insert guess fail, invalid player guessed', guess)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else if (req.session.player.guesses[ind].includes(guess)) {
      console.log('insert guess fail, already guessed', playerData[guess].name)
      res.locals.guessReturn = {
        guessStatus: -1,
        guessesLeft: req.session.player.guessesLeft,
        gameStatus: 0,
      }
      next()
    }
    else {
      // all good
      req.session.player.guesses[ind].push(guess)
      req.session.player.guessesLeft -= 1

      if (checkPlayerGrid(guess, puzzle[PUZZLES_GRID[ind][0]], puzzle[PUZZLES_GRID[ind][1]])) {
        req.session.player.board[ind] = guess
        // TODO: update db from here
        res.locals.guessReturn = {
          guessStatus: 1,
          guessesLeft: req.session.player.guessesLeft,
          gameStatus: req.session.player.board.filter(x => x === undefined || x === null).length === 0 ? 1 : 0,
        }
        next()
      }
      else {
        res.locals.guessReturn = {
          guessStatus: 0,
          guessesLeft: req.session.player.guessesLeft,
          gameStatus: req.session.player.guessesLeft <= 0 ? -1 : 0,
        }
        next()
      }
    }
  }
  catch (err) {
    console.log('insert guess fail, error', err)
    res.locals.guessReturn = {
      guessStatus: -1,
      guessesLeft: 0,
      gameStatus: 0,
    }
    next()
  }
}

function checkPlayer(req, res, next) {
  if (req.session.player === undefined) {
    res.locals.guessReturn = {
      guessStatus: -1,
      guessesLeft: 0,
    }
    next()
  }
  else if (JSON.stringify(req.session.player.puzzle) !== JSON.stringify(puzzle)) {
    res.locals.guessReturn = {
      guessStatus: -1,
      guessesLeft: 0,
    }
    next()
  }
  else {
    next()
  }
}

app.get('/', [checkPuzzle, initPlayer], (req, res) => {
  res.render('index', { puzzle: puzzle, players: playerList, currGame: req.session.player })
})

app.post('/insertGuess', [checkPlayer, insertGuessHelper], (req, res) => {
  res.send(res.locals.guessReturn)
})

app.listen(process.env.PORT || 4000, () => console.log("Server is running..."))

// npx tailwindcss -i .\static\styles.css -o ./static/output.css --watch
