document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const output = document.getElementById('output');
    const audioPlayer = document.getElementById('audioPlayer');
    const recognition = new webkitSpeechRecognition();

    recognition.lang = 'en-US';

    // Function to synthesize and play speech
    const speakText = (text) => {
        const polly = new AWS.Polly({
            region: 'ap-south-1',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        });

        const params = {
            Text: text,
            OutputFormat: 'mp3',
            VoiceId: 'Joanna'
        };

        try {
            polly.synthesizeSpeech(params, (error, data) => {
                if (error) {
                    console.error('AWS Polly Error:', error);
                } else {
                    const audioUrl = URL.createObjectURL(new Blob([data.AudioStream.buffer], { type: 'audio/mp3' }));
                    // Automatically play the audio
                    const audioElement = new Audio(audioUrl);
                    audioElement.play();
                }
            });
        } catch (error) {
            console.error('AWS Polly Error:', error);
        }
    };

    const welcomeText = "Welcome to Nylas Calendar. You can create a new event or check today's events.";
    const createEventRegex = /create event|create new event|please create a new event for me|can you create a new event for me/i;
    let isCreatingEvent = false;
    let eventTitle = '';
    let eventDate = '';

    recognition.onresult = (event) => {
        const result = event.results[0][0].transcript;
        output.innerHTML = `${result}`;
        if (result.toLowerCase().includes('hello')) {
            speakText(welcomeText);
        } if (result.toLowerCase().includes("today's events") || result.toLowerCase().includes("two days events")) {
            fetch('http://192.168.29.13:9000/read-events')
                .then(response => response.json())
                .then(data => {
                    console.log('Today\'s Events:', data);
                    // Handle the fetched events as needed
                    if (data.length === 0) {
                        speakText('There are no upcoming events today.');
                    } else {
                        const upcomingEventsMessage = 'Upcoming events are:';
                        const eventTexts = data.map((event, index) => `Number ${index + 1}: ${event.title}`);

                        const speakUpcomingEvents = async () => {
                            await new Promise(resolve => setTimeout(resolve, 1500)); // Wait for 3 seconds
                            speakText(upcomingEventsMessage);

                            for (const eventText of eventTexts) {
                                await new Promise(resolve => setTimeout(resolve, 2500)); // Wait for 3 seconds before each event
                                speakText(eventText);
                            }
                        };

                        speakUpcomingEvents();
                    }
                })
                .catch(error => {
                    console.error('Error fetching today\'s events:', error);
                });
        }
        if (createEventRegex.test(result.toLowerCase())) {
            speakText('Please tell calendar title');
            isCreatingEvent = true;
            eventTitle = result;
        } else if (isCreatingEvent) {
            // Assume that the next user input is the title
            eventTitle = result;
            speakText('Please tell the event date');
            isCreatingEvent = false; // Next input should be the date
        } else {
            if (eventTitle && !eventDate) {
                eventDate = result;
                console.log('Event Title:', eventTitle);
                console.log('Event Date:', eventDate);
                const momentDate = moment(eventDate, 'D MMMM');
                const formattedDate = momentDate.format('YYYY-MM-DD');
                fetch('http://192.168.29.13:9000/create-event', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: eventTitle,
                        date: formattedDate
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => {
                        console.log('Event created:', data);
                    })
                    .catch((error) => {
                        console.error('Error creating event:', error);
                });

                const success_message = eventTitle + 'created successfully for date ' + eventDate
                speakText(success_message)
            }
        }
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === 'H' || e.key === 'h') {
            recognition.start();
        }
    });

    startButton.addEventListener('click', () => {
        recognition.start();
    });
});