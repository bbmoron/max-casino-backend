require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyparser = require('body-parser');
const cookieparser = require('cookie-parser');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));
app.use(cookieparser());

const countriesModel = new mongoose.Schema({
  code: String,
  prohibited: Boolean,
});

const countryListsModel = new mongoose.Schema({
  id: Number,
  list: [countriesModel],
});
const CountryList = mongoose.model('CountryList', countryListsModel);

const linksModel = new mongoose.Schema({
  id: Number,
  link: String,
});
const Link = mongoose.model('Link', linksModel);

app.get('/', (req, res) => {
  if (!req.cookies) return res.redirect('/auth');
  return res.sendFile(path.join(`${__dirname}/public/index.html`));
});

app.get('/success', (_req, res) => res.redirect('/'));

app.get('/auth', (_req, res) => res.sendFile(path.join(`${__dirname}/public/auth.html`)));

app.post('/auth', (req, res) => {
  if (process.env.PASSWORD !== req.body.password) {
    return res.json({
      allowed: false,
    });
  }
  res.cookie('authorized', 1, { maxAge: 90000 });
  return res.json({
    allowed: true,
  });
});

app.get('/data', async (_req, res) => {
  const countries = await CountryList.findOne({ id: 1 });
  const link = await Link.findOne({ id: 1 });
  return res.json({
    countries: countries || [],
    link: link || '',
  });
});

app.post('/appinfo', async (req, res) => {
  const { countryCode } = req.body;
  const countries = await CountryList.findOne({ id: 1 });
  const link = await Link.findOne({ id: 1 });
  if (!countries) {
    return res.json({
      error: true,
      data: { text: 'Database is down. Check MongoDB instance or contact administrator' },
    });
  }
  const prohibited = countries.list.filter((country) => country.code === countryCode);
  return res.json({
    error: false,
    data: {
      text: '',
      prohibited: prohibited[0] || false,
      link: prohibited[0] ? link.link : '',
    },
  });
});

app.post('/save', (req, res) => {
  const { link, countries } = req.body;
  const mapped = countries.map((country) => ({ code: country.code, prohibited: country.prohibited }));
  CountryList.update({ id: 1 }, { id: 1, list: mapped }, { upsert: true }, (countryErr) => {
    if (countryErr) return res.json({ error: true, data: { text: 'Something went wrong with the update, retry' } });
    Link.update({ id: 1 }, { id: 1, link }, { upsert: true }, (linkErr) => {
      if (linkErr) return res.json({ error: true, data: { text: 'Something went wrong with the update, retry' } });
      return res.json({
        error: false,
        data: {
          text: 'Updated successfully',
          list: mapped,
          link,
        },
      });
    });
  });
});

app.listen(process.env.PORT);
