const cheerio = require('cheerio');
const createBrowserless = require('browserless')

async function getESPN(cheerio, createBrowserless, type) {
    // First, create a browserless factory 
    // that it will keep a singleton process running
    const browserlessFactory = createBrowserless()

    // After that, you can create as many browser context
    // as you need. The browser contexts won't share cookies/cache 
    // with other browser contexts.
    const browserless = await browserlessFactory.createContext()

    let html = await browserless.html('https://www.espn.com/mlb/game/_/gameId/401228322');
    
    // After your task is done, destroy your browser context
    await browserless.destroyContext()

    // At the end, gracefully shutdown the browser process
    await browserlessFactory.close()

    let dom = cheerio.load(html);
    let domAthleteElements = dom('#accordion__parent tbody.athletes');
    let players = [];

    for(let i = 0; i < domAthleteElements.length; i++) {
        let player = {};
        let playerName = domAthleteElements.eq(i).find('a > span.name').text();
        let playerStats = domAthleteElements.eq(i).find('.batting-stats-h-ab').text();

        if(playerName == '') {
            continue;
        }
        
        player.name = playerName;
        player.stats = playerStats;

        players.push(player);
    }

    return players;
}

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.get('/', function(req, res) {
    var options = {
        root: path.join(__dirname)
    };
   res.sendFile('index.html', options);
});

var counter = 0;

//Whenever someone connects this gets executed
io.on('connection', async function(socket) {
    console.log('A user connected');

    socket.on('updateStatsFromClient', async function() {
        let players = await getESPN(cheerio, createBrowserless);
        io.sockets.emit('updateStatsFromServer', {players: players});
    })

    let players = await getESPN(cheerio, createBrowserless);
    io.sockets.emit('updateStatsFromServer', {players: players});
 
    //Whenever someone disconnects this piece of code executed
    socket.on('disconnect', function () {
       console.log('A user disconnected');
    });
 });

http.listen(3000, function() {
   console.log('listening on *:3000');
});