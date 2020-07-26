require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyparser = require('body-parser');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

const app = express();
app.use(express.static(process.env.STATIC));
app.use(cors());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: false }));

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

app.get('/', (_req, res) => res.sendFile('index.html'));

app.get('/data', async (_req, res) => {
  const countries = await CountryList.findOne({ id: 1 });
  const link = await Link.findOne({ id: 1 });
  return res.json({
    countries: countries || [],
    link: link || '',
  });
});

app.get('/appinfo', async (req, res) => {
  const { countryCode } = req.headers;
  const countries = await CountryList.findOne({ id: 1 });
  if (!countries) {
    return res.json({
      error: true,
      data: { text: 'Database is down. Check MongoDB instance or contact administrator' },
    });
  }
  const prohibited = countries.filter((country) => country.code === countryCode);
  return res.json({
    error: false,
    data: {
      text: '',
      prohibited: prohibited || false,
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
