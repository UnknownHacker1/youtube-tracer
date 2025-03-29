const express = require('express')
const {google} = require('googleapis');
const axios = require('axios')
const app = express();
const port = 3000;
const apiKey = '..';
const apiURL = 'https://www.googleapis.com/youtube/v3';
const fs = require('fs');
const repl = require("repl");
var getSubtitles = require('youtube-captions-scraper').getSubtitles;
app.listen(port, ()=>{
    console.log("Server is up!");
});
app.get("/", async(req, res) =>{
    res.send("test");
});
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
function replaceAll(str, match, replacement){
    return str.replace(new RegExp(escapeRegExp(match), 'g'), ()=>replacement);
}
async function subtitlesFormatted(id) {
    if (id === undefined) {
        console.error("undefined id");
        return undefined;
    }
    let str = String();

    try {
        await getSubtitles({
            videoID: id
        }).then(function (captions) {
            //console.log(captions[0].text);
            //console.log(captions.length);
            for (let i = 0; i < captions.length; i++) {
                str += captions[i].text.toLowerCase() + ' ';
                //console.log(captions[i].text);
            }
        })
        str=replaceAll(str, '.','');
        str=replaceAll(str, ',', '');
        str=replaceAll(str, ';',  '');
    }
    catch(err){
        console.log(err);
        return undefined;
    }
    //console.log(str);
    return str.split(' ');
}


function match(s1, s2){
    console.log(`Product = ${s1.length*s2.length}`);
    if(s1.length < s2.length) {
        let copy = s1;
        s1 = s2;
        s2 = copy;
    }
    let n = s1.length, m = s2.length;
    let dp = [[]];
    for(let i = 0; i < 2; i++){
        dp.push([]);
        for(let j = 0; j <= m; j++){
            dp[i].push(0);
        }
    }
    let ret = 0;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i % 2][j] = dp[(i - 1) % 2][j - 1] + 1;
                if (dp[i % 2][j] > ret)
                    ret = dp[i % 2][j];
            }
            else
                dp[i % 2][j] = 0;
        }
    }
    return ret;
}

app.get("/q", async(req, res, next) =>{
    console.clear();
    try{
        const id = req.query.id;
        // console.log(`id=${id}`);
        let url = `${apiURL}/videos?part=snippet&id=${id}&key=${apiKey}`;
        let response = await axios.get(url);
        const channelId = response.data.items[0].snippet.channelId;
        //res.send(await subtitlesFormatted(id));
        let shortSubtitles = await subtitlesFormatted(id);
        res.send(shortSubtitles);
        let date = response.data.items[0].snippet.publishedAt;
        url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=500&publishedAfter=${date}`;
        let urlbef = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=500&publishedBefore=${date}` // its more likely the video has been uploaded before the short
        // So i decided to distribute it 300 : 200 instead of 250 : 250
        response = await axios.get(urlbef);
        //res.send(response.data.items);
        let response2 = await axios.get(url);
        // response, response2 are the videos
        let arr = [];
        let bestVideo = "", len = -1;
        for(let i = 0; i < response.data.items.length; i++){
            console.log(i);
            const videoId = response.data.items[i].id.videoId;
            if(videoId === id)
                continue;
            let prevTime = Date.now();
            let videoSubtitles = await subtitlesFormatted(videoId);
            console.log(`Time taken to scrape subtitles = ${Date.now() - prevTime}`);
            if(videoSubtitles === undefined)
                continue;
            prevTime = Date.now();
            let matchLength = match(shortSubtitles, videoSubtitles);
            console.log(`Time taken = ${Date.now() - prevTime}`);
            if(matchLength > len){
                len = matchLength;
                bestVideo = videoId;
            }
        }
        for(let i = 0; i < response2.data.items.length; i++){
            console.log(i);
            let videoId = response2.data.items[i].id.videoId;
            if(videoId === id)
                continue;
            let prevTime = Date.now();
            let videoSubtitles = await subtitlesFormatted(videoId);
            console.log(`Time taken to scrape subtitles = ${Date.now() - prevTime}`);
            if(videoSubtitles === undefined)
                continue;
            prevTime = Date.now();
            let matchLength = match(shortSubtitles, videoSubtitles);
            console.log(`Time taken to match = ${Date.now() - prevTime}`);
            if(matchLength > len){
                len = matchLength;
                bestVideo = videoId;
            }
        }
        console.log(bestVideo);
        console.log(len);
    }catch(err){
        next(err);
    }
});
