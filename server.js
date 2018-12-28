const { Bot, Keyboard } = require('node-vk-bot');

const Nightmare = require('nightmare');

let mirrorLink, onexBetLink, mortalCombatSubLink = '/live/Mortal-Kombat/';

let games = [], gameStats = [];

const bot = new Bot({
    token: '8bde4f813ee9c10aadc18091e8add25049c5e9364ab0ad74f6b637744b264610fcb2c111e92e06f3db2e1',
    group_id: 173496054,
    api: {
        v: 5.87,
        lang: 'ru'
    }
});
bot.start();

startCheck();

async function getUrl(link){
    let nightmare = Nightmare({
        show: true,
        waitTimeout: 15000,
        gotoTimeout: 15000,
        loadTimeout: 15000,
    }), result = 0;
    await nightmare
        .goto(link)
        .wait(4000)
        .url()
        .end()
        .then(url => {
            result = url;
        })
        .catch((error) => {
            console.error('Get URL error:', error);
            result = 0;
        });
    return result;
}

async function setUrl(link){
    let str,
        index = link.search('/user/');
    str = link.substring(0, index);
    str += mortalCombatSubLink;
    return str;
}

async function checkGameData(game){
    console.log(game);
    let nightmare = Nightmare({
        show: true,
        waitTimeout: 15000,
        gotoTimeout: 15000,
        loadTimeout: 15000,
    });
    nightmare
        .goto(game)
        .wait('div.bets.betCols1')
        .wait(2000)
        .evaluate(() => {
            return Array.from(document.querySelectorAll('div.bets.betCols1 div')).map(element => element.innerText);
        })
        .end()
        .then((result) => {
            let j = 0, right;
            while (result[j] !== undefined){
                if (result[j].search('Без добивания в 1 раунде') !== -1){
                    console.log(result[j]);
                    right = result[j];
                    break;
                }
                j++;
            }
            if (right !== undefined){
                let index = right.search('\n'),
                    coefficient = right.substring(index),
                    message = right.substring(0, index);
                console.log(coefficient);
                if (coefficient >= 2.5){
                    console.log('Right coefficient');
                    bot.send(game + '\n' + message + ': ' + coefficient, 59750287);
                } else {
                    console.log('Wrong coefficient');
                }
            }
        })
        .catch((error) => {
            console.error('Get coefficient error:', error);
        });
}

async function checkGames(){
    for (let i = games.length - 1; i >= 0; i--){
        checkGameData(games[i]);
    }
}

async function getMirror(){
    let nightmare = Nightmare({
        show: true,
        waitTimeout: 15000,
        gotoTimeout: 15000,
        loadTimeout: 15000,
    }),
        result = 0;
    await nightmare
        .goto('https://cyber.sports.ru/tribuna/blogs/1xbet_stavki/1824052.html')
        .wait('.material-item__content')
        .evaluate(() => {
            return document.querySelector('.material-item__content p strong a').href;
        })
        .end()
        .then((link) => {
            result = link;
        })
        .catch((error) => {
            console.error('Mirror error:', error);
            result = 0;
        });
    return result;
}

async function getLiveGames(liveGames){
    let nightmare = Nightmare({
        show: true,
        waitTimeout: 15000,
        gotoTimeout: 15000,
        loadTimeout: 30000,
    }), result = [];
    await nightmare
        .goto(liveGames)
        .wait('a.c-events__name')
        .evaluate(() => {
            return Array.from(document.querySelectorAll('a.c-events__name')).map(element => element.href);
        })
        .end()
        .then(results => {
            result = results;
        })
        .catch((error) => {
            console.error('Get games data error:', error);
            result = [0];
        });
    return result;
}

async function getGames(){
    mirrorLink = await getMirror();
    if (mirrorLink === 0){
        sendError('На данный момент нет доступных зеркал, поиск будет повторен через минуту');
        return 0;
    }
    console.log(mirrorLink);
    onexBetLink = await getUrl(mirrorLink);
    if (mirrorLink === 0){
        sendError('Не удалось получить ссылку на 1xBet, возможно сервера недоступны, поиск будет повторен через минуту');
        return 0;
    }
    let liveGames = await setUrl(onexBetLink);
    console.log('Live games link: ', liveGames);
    console.log('1xBet link: ', onexBetLink);
    games = await getLiveGames(liveGames);
    if (games[0] === 0){
        sendError('Не удалось получить список игр, поиск будет повторен через минуту');
        return 0;
    }
    console.log('Games: ', games);
    return await checkGames();
}

async function retryCheckGames() {
    let error;
    error = await getGames();
    if (error === 0){
        console.log('Retry check');
        setTimeout(() => {
            retryCheckGames();
        }, 1000 * 60);
    }
}

async function startCheck (){
    let error;
    console.log('Checking games');
    error = await getGames();
    if (error === 0){
        setTimeout(() => {
            console.log('First retry check');
            retryCheckGames();
        }, 1000 * 60);
    }
    setInterval(async () => {
        console.log('Checking games');
        error = await getGames();
        if (error === 0){
            setTimeout(() => {
                console.log('First retry check');
                retryCheckGames();
            }, 1000 * 60);
        }
    }, 5 * 60 * 1000);
}

async function sendError(err){
    console.log('Send error: ' + err);
    bot.send(err, 59750287);
}

bot.get(/Зеркало/i, async (msg, exec, reply) => {
    console.log(msg);
    reply(await getMirror());
});

bot.get(/Игры/i, (msg) => {
    console.log(msg);
    getGames();
});