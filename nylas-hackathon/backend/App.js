const express = require('express');
const Nylas = require('nylas');
const moment = require("moment");
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 9000;

Nylas.config({
    clientId: process.env.NYLAS_CLIENT_ID,
    clientSecret: process.env.NYLAS_CLIENT_SECRET,
});

const nylas = Nylas.with(process.env.NYLAS_ACCESS_TOKEN);

app.use(express.json());
app.use(cors());

app.post('/create-event', (req, res) => {
    const nylasEvent = {
        calendar_id: process.env.NYLAS_CALENDAR_ID,
        title: req.body.title,
        busy: true,
        when: {
            date: req.body.date, // Use the desired event time
        },
    };
    axios
        .post('https://api.nylas.com/events', nylasEvent, {
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${process.env.NYLAS_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        })
        .then((response) => {
            console.log('Event created:', response.data);
            res.json({ message: 'Event created successfully', event: response.data });
        })
        .catch((error) => {
            console.error('Error creating event:', error.response.data);
            res.status(error.response.status || 500).json({
                error: 'An error occurred while creating the event',
                details: error.response.data,
            });
        });
});

app.get('/read-events', (req, res) => {
    const todayStart = moment().startOf('day').unix();
    const todayEnd = moment().endOf('day').unix();


    nylas.events.list({ limit: 10, starts_after: todayStart, ends_before: todayEnd})
        .then(events => {
            const formattedEvents = events.map(event => ({
                title: event.title,
                description: event.description,
                time: event.when.date,
                calendar_id: event.calendar_id,

            }));
            res.json(formattedEvents);
        })
        .catch(error => {
            console.error('Error fetching events:', error);
            res.status(500).json({ error: 'An error occurred while fetching events' });
        });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});


