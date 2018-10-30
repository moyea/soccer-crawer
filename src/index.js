const puppetter = require('puppeteer');

const getInnerText = (el, selector) => el.querySelector(selector).innerText;

(async () => {
  const browser = await puppetter.launch({
    headless: false
  });
  const page = await browser.newPage();
  await page.goto('http://zq.win007.com/cn/League/36.html');
  await page.waitFor(1500);
  await page.waitForSelector('#Table2');
  const turns = await page.evaluate(() => {
    return [...document.querySelectorAll('#Table2 tbody tr td:nth-child(n+2)')];
  });

  await page.waitFor(2000);

  let all = {};
  console.log(turns);

  [1, 2, 3, 4, 5].forEach(async t => {
    // console.log(t);
    // let turn = t.innerText.replace('\t', '');

    await page.click('#Table2 tbody tr td:nth-child(n+' + (2 + t) + ')');
    await page.waitFor(5);
    const data = await page.evaluate(() => {
      const trList = document.querySelectorAll('#Table3 tbody tr:nth-child(3)');
      let data = [];
      trList.forEach(ele => {
        let tds = ele.querySelectorAll('td');
        data.push({
          turn: tds.item(0).innerText,
          time: tds.item(1).innerText,
          home: tds.item(2).innerText,
          score: tds.item(3).innerText,
          away: tds.item(4).innerText,
          a: {
            full: tds.item(5).innerText,
            half: tds.item(6).innerText
          },
          size: {
            full: tds.item(7).innerText,
            half: tds.item(8).innerText
          },
          half: tds.item(10).innerText
        });
      });
      return data;
    });
    console.log(data);
    all[t] = data;
  });
  console.log(all);
  await page.waitFor(150000);
  // console.log(data);
  await browser.close();
})();
