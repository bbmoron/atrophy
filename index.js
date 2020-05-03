const express = require('express');
const bodyparser = require('body-parser');
const cors = require('cors');
const { ExploreTrendRequest } = require('g-trends');

const app = express();
app.use(cors());
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

const request = async (keyword) => {
  const explorer = new ExploreTrendRequest();
  const date = new Date();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const year = date.getUTCFullYear();
  const csv = await explorer.addKeyword(keyword).between('2016-01-01', `${year}-${month}-${day}`).download();
  csv.shift();
  return csv.map((d) => {
    const obj = {};
    obj[d[0]] = Number.parseInt(d[1], 10);
    return obj[d[0]] > 60 ? obj : null;
  }).filter((d) => d != null);
};

const calc = (dates) => {
  const response = {};
  dates.forEach((d) => {
    const keys = Object.keys(d);
    keys.forEach((key) => {
      const _ = key.split('-');
      const year = _[0];
      const month = _[1];
      if (!response[year]) response[year] = { total: 0 };
      response[year][month] = response[year][month] ? response[year][month] + d[key] : d[key];
      response[year].total += d[key];
    });
  });
  return response;
};

const bestMonth = (calculated) => Object.keys(calculated).map((key) => {
  const copy = JSON.parse(JSON.stringify(calculated[key]));
  let max = null;
  delete copy.total;
  const kkeys = Object.keys(copy);
  kkeys.forEach((kkey) => {
    if (!max || max < copy[kkey]) max = copy[kkey];
  });
  const month = kkeys.filter((kkey) => copy[kkey] === max)[0];
  const obj = {};
  obj[month] = max;
  return obj;
});

const removeDups = (arr) => {
  const final = [];
  const monthAlreadyIn = [];
  arr.map((el) => {
    const keys = Object.keys(el);
    if (!monthAlreadyIn.includes(keys[0])) {
      const obj = {};
      obj[keys[0]] = el[keys[0]];
      final.push(obj);
      monthAlreadyIn.push(keys[0]);
    }
    return el;
  });
  return final;
};

app.get('/query/:keyword', async (req, res) => {
  const { keyword } = req.params;
  const data = await request(keyword);
  const calculated = calc(data);
  const best = bestMonth(calculated);
  const final = removeDups(best);
  res.json({
    data: final,
  });
});

app.listen(3000);
