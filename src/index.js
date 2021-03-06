const puppetter = require('puppeteer');
const fs = require('fs');
const path = require('path');

const Excel = require('exceljs');

const date = '2018-2019';
const _name = `意甲${date}`;
const linkURL = `http://zq.win007.com/cn/League/34.html`;

const workbook = new Excel.stream.xlsx.WorkbookWriter({
    filename: `./${_name}.xlsx`
});
const currentTurn = 16;
const totalTurn = 38;

const worksheet = workbook.addWorksheet('Sheet');

worksheet.columns = [
    {header: '轮次', key: 'turn'},
    {header: '时间', key: 'time'},
    {header: '主场', key: 'home'},
    {header: '比分', key: 'score'},
    {header: '客场', key: 'away'},
    {header: '赔率来源', key: 'oddsList'},
    {header: '公司名称', key: 'company'},
    {header: '主胜', key: 'zhu'},
    {header: '和', key: 'he'},
    {header: '客胜', key: 'ke'},
    {header: '主胜率', key: 'zhuWinScore'},
    {header: '和率', key: 'heWinScore'},
    {header: '客胜率', key: 'keWinScore'},
    {header: '返还率', key: 'back'},

];

(async () => {
    const browser = await puppetter.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.goto(linkURL);
    await page.waitForSelector('#Table2');
    const turns = await page.evaluate(() => {
        return [...document.querySelectorAll('#Table2 tbody td')]
            .filter((item, i) => i > 0)
            .map(item => +item.innerText);
    });

    const getData = async () => await page.evaluate(() => {
        const tags = {
            analysis: '[析]',
            oddsList: '[欧]',
            asiaOdds: '[亚]',
            overDown: '[大]'
        };
        const getTextFromTds = (tds, index) => tds.item(index).innerText.replace('\t', '');
        const getLinksFromTds = (tds, index, tag) => [...tds.item(index).querySelectorAll('a')]
            .filter(a => a.innerText === tag)
            .map(a => a.href)[0];
        const trList = document.querySelectorAll('#Table3 tbody tr:nth-child(n+3)');
        let data = [];
        trList.forEach(ele => {
            let tds = ele.querySelectorAll('td');
            data.push({
                turn: getTextFromTds(tds, 0),
                time: getTextFromTds(tds, 1).replace('\n', ' '),
                home: getTextFromTds(tds, 2),
                score: getTextFromTds(tds, 3).replace('\n', ''),
                away: getTextFromTds(tds, 4),
                a: {
                    full: getTextFromTds(tds, 5),
                    half: getTextFromTds(tds, 6)
                },
                size: {
                    full: getTextFromTds(tds, 7),
                    half: getTextFromTds(tds, 8)
                },
                extraLink: {
                    analysis: getLinksFromTds(tds, 9, tags.analysis),
                    odds_list: getLinksFromTds(tds, 9, tags.oddsList),
                    asia_odds: getLinksFromTds(tds, 9, tags.asiaOdds),
                    over_down: getLinksFromTds(tds, 9, tags.overDown)
                }
            });
        });
        return data;
    });

    const data = await Promise.all(turns.map(async t => {
        await page.waitFor(t * 100);
        let row = Math.ceil(t / (totalTurn / 2));
        let col = (row > 1 ? 0 : 1) + t - ((row - 1) * (totalTurn / 2));
        let selector = '#Table2 tbody tr:nth-child(' + row + ') td:nth-child(n+' + col + ')';
        await page.click(selector);
        await page.waitFor(5);
        return await getData();
    }));
    console.log(data);

    const fullData = await Promise.all(data
        .reduce((prev, cur) => prev.concat(cur), [])
        .map(item => ({
                turn: item.turn,
                time: item.time,
                home: item.home,
                score: item.score,
                away: item.away,
                oddsList: (item.extraLink || {}).odds_list
            })
        )
        // .slice(0, 3)
        .map(async (item, idx) => {
            if (item.oddsList && item.turn < currentTurn) {
                await page.waitFor(idx * 20000);
                const bet365 = await getWinScore(browser, item.oddsList, 281);
                return {
                    ...item,
                    ...bet365
                }
            }
            return {
                ...item,
                company: '',
                zhu: '',
                he: '',
                ke: '',
                zhuWinScore: '',
                heWinScore: '',
                keWinScore: '',
                back: '',
            };
        }));

    await browser.close();

    fullData.forEach(obj => {
        worksheet.addRow(obj).commit();
    });
    workbook.commit();
    console.log('脚本执行成功...');

    // const file = path.join(__dirname, 'data/turn.json');
    // fs.writeFile(file, JSON.stringify(data), err => {
    //     if (err) console.log(err);
    //
    // })
})();


let i = 1;
const getWinScore = async (browser, url, companyId) => {
    console.log(url);
    const page = await browser.newPage();
    try {
        await page.goto(url);
        await page.waitForSelector('#dataList');
        await page.evaluate(() => {
            window.changeShowType(2);
        });
        await page.waitFor(5);
        await page.waitForSelector('#dataList');
        const data = await page.evaluate(() => {
            const getTextFromTds = (tds, index) => tds.item(index).innerText.replace('\t', '');
            const getCompanyId = (tds) => tds.item(1).querySelector('a').href.split('?')[1].split('&').reduce((acc, cur) => {
                let tmpArr = cur.split('=');
                acc[tmpArr[0]] = tmpArr[1];
                return acc;
            }, {}).id;
            if (!document.querySelector('#oddsList_tab')) {
                return {
                    id: '',
                    company: '',
                    zhu: '',
                    he: '',
                    ke: '',
                    zhuWinScore: '',
                    heWinScore: '',
                    keWinScore: '',
                    back: '',
                    k1: '',
                    k2: '',
                    k3: '',
                    changeTime: '',
                    historyIndex: ''
                };
            }

            return [...document.querySelectorAll('#oddsList_tab tr')]
                .map(tr => {
                    let tds = tr.querySelectorAll('td');
                    return {
                        id: getCompanyId(tds),
                        company: getTextFromTds(tds, 1),
                        zhu: getTextFromTds(tds, 2),
                        he: getTextFromTds(tds, 3),
                        ke: getTextFromTds(tds, 4),
                        zhuWinScore: getTextFromTds(tds, 5),
                        heWinScore: getTextFromTds(tds, 6),
                        keWinScore: getTextFromTds(tds, 7),
                        back: getTextFromTds(tds, 8),
                        k1: getTextFromTds(tds, 9),
                        k2: getTextFromTds(tds, 10),
                        k3: getTextFromTds(tds, 11),
                        changeTime: getTextFromTds(tds, 12),
                        historyIndex: getTextFromTds(tds, 13)
                    }
                });
        });
        await page.close();
        // let key = /\d+.htm/.exec(url)[0].replace('.htm', '') || i++;
        // saveToExcel(data, key);
        return data.find(item => item.id === companyId + '');
    } catch (e) {
        page.close();
        return {};
    }
};


const saveToExcel = (data, key) => {
    const workbook = new Excel.stream.xlsx.WorkbookWriter({
        filename: `./${_name}/odds_${key}.xlsx`
    });
    const worksheet = workbook.addWorksheet('Sheet');
    worksheet.columns = [
        {header: '公司名称', key: 'company'},
        {header: '主胜', key: 'zhu'},
        {header: '和', key: 'he'},
        {header: '客胜', key: 'ke'},
        {header: '主胜率', key: 'zhuWinScore'},
        {header: '和率', key: 'heWinScore'},
        {header: '客胜率', key: 'keWinScore'},
        {header: '返还率', key: 'back'},
        {header: '凯利指数1', key: 'k1'},
        {header: '凯利指数2', key: 'k2'},
        {header: '凯利指数3', key: 'k3'},
        {header: '变化时间', key: 'changeTime'},
        {header: '历史指数', key: 'historyIndex'},
    ];
    data.forEach(obj => {
        worksheet.addRow(obj).commit();
    });
    workbook.commit();
};





