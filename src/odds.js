const URL = 'http://op1.win007.com/oddslist/1552244.htm';

const puppetter = require('puppeteer');
const Excel = require('exceljs');

const workbook = new Excel.stream.xlsx.WorkbookWriter({
    filename: './odds.xlsx'
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

(async () => {
    const browser = await puppetter.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.goto(URL);
    await page.waitForSelector('#oddsList_tab');
    const data = await page.evaluate(() => {
        const getTextFromTds = (tds, index) => tds.item(index).innerText.replace('\t', '');
        return [...document.querySelectorAll('#oddsList_tab tr')]
            .map(tr => {
                let tds = tr.querySelectorAll('td');
                return {
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

    // console.log(JSON.stringify(data));
    await browser.close();

    data.forEach(obj=>{
        worksheet.addRow(obj).commit();
    });
    workbook.commit()
})();
