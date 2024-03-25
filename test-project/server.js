const express = require('express');
const puppeteer = require('puppeteer');
const querystring = require('node:querystring');
const bodyParser = require('body-parser');
const { componentsToColor } = require('pdf-lib');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' directory

function getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function getCoordinates(city) {
    const apiKey = '130a7b0e18ec45ee884b910adc14625d';
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${apiKey}&limit=1`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            const geometry = data.results[0].geometry;
            return { latitude: geometry.lat, longitude: geometry.lng };
        } else {
            throw new Error('No results found for the city');
        }
    } catch (error) {
        console.error('Error fetching coordinates:', error);
        throw error;
    }
}

// Function to calculate distance between two points using Haversine formula and return distance in miles
function calculateDistanceInMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180; // Convert degrees to radians
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in miles
    return distance;
}

async function scrapeFlightPrice(origin, destination, startDate, endDate, name) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',
    });
    const page = await browser.newPage();
    try {
        // Define the search query using the q parameter
        //https://www.google.com/travel/flights?hl=en&gl=us&curr=USD&q=Flights+to+AUS+from+CDG+on+2024-03-27+through+2024-03-28
        const q = `Flights+to+${destination}+from+${origin}+on+${startDate}+through+${endDate}`;

        // Navigate to the Google Flights page with the specified parameters
        const url = `https://www.google.com/travel/flights?hl=en&gl=us&curr=USD&q=${q}`;
        console.log(url);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Wait for the element containing the flight price to be visible
        const priceElement = await page.waitForSelector('div .YMlIz.FpEdX.jLMuyc');

        await page.screenshot({ path: __dirname + '/pdf/temp/' + getCurrentDate() + "_air.jpg"  });

        if (priceElement) {

            // Extracting the dollar amount using string manipulation
            const priceText = await priceElement.evaluate(el => el.textContent); 
            console.log(priceText);
            dollarAmount = parseInt(priceText.substring(1));
            console.log(dollarAmount);
            return dollarAmount;
        } else {
            return 0;
        }

    } catch (error) {
        console.error('Error scraping flight price:', error);
        return null;
    } finally {
        await browser.close();
    }
}

async function scrapeRentalCars(origin, destination, startDate, endDate, name) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome-stable',
    });
    const page = await browser.newPage();
  
    try {
      // Navigate to hertz's website
      await page.goto('https://www.hertz.com/rentacar/reservation/');
  
      // Wait for the search form to load
      await page.waitForSelector('#pickup-location');

      // Click on the "Same Location" checkbox
      await page.evaluate(() => {
        document.querySelector('#new-locSelect option:nth-child(2)').selected = true;
      });
  
      // Input destination, start date, and end date
      await page.type('#pickupLocation', origin);
      //await page.type('#dropoffLocationTextBox', destination);
        // Change the inner HTML of a div within a div with id 'pickup-date-box'
      await page.evaluate(() => {
        const parentElement = document.getElementById('pickup-date-box');
        if (parentElement) {
        const innerDiv = parentElement.querySelector('div'); 
        if (innerDiv) {
            innerDiv.innerHTML = startDate;
        } else {
            console.error('No inner div found inside div with id "pickup-date-box"');
        }
        } else {
        console.error('Element with id "pickup-date-box" not found');
        }
      });

      await page.evaluate(() => {
        const parentElement = document.getElementById('dropoff-date-box');
        if (parentElement) {
        const innerDiv = parentElement.querySelector('div'); 
        if (innerDiv) {
            innerDiv.innerHTML = endDate;
        } else {
            console.error('No inner div found inside div with id "pickup-date-box"');
        }
        } else {
        console.error('Element with id "pickup-date-box" not found');
        }
      });
      //await page.type('#pickup-date-box div', startDate); 
      //await page.type('#dropoff-date-box div', endDate);

      // Click on the search button
      await page.click('.res-submit');

      await page.screenshot({ path: __dirname + '/pdf/temp/' + getCurrentDate() + "_rental"  });

    } catch (error) {
      console.error('Error scraping Hertz rental cars:', error);
      return [];
    } finally {
      await browser.close();
    }
  }
  

  async function fillPdf(inputPdfPath, outputPdfPath, rentalPrice, name, origin, destination, startDate, endDate, miles) {
    try {
        console.log("pdf time");
        const existingPdfBytes = fs.readFileSync(inputPdfPath);
        console.log('loading pdf');

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        console.log('loaded pdf');

        const form = pdfDoc.getForm();
        console.log(form);

        const fields = form.getFields()
        fields.forEach(field => {
            const type = field.constructor.name
            const name = field.getName()
            console.log(`${type}: ${name}`)
        })

        // Fetch coordinates of the cities
        const [coordinates1, coordinates2] = await Promise.all([getCoordinates(origin), getCoordinates(destination)]);
        const zipMiles = calculateDistanceInMiles(coordinates1.latitude, coordinates1.longitude, coordinates2.latitude, coordinates2.longitude);
        console.log(zipMiles);

        const nameField = form.getTextField('name');
        const startDateField = form.getTextField('startDate');
        const endDateField = form.getTextField('endDate');
        const originField = form.getTextField('origin');
        const destinationField = form.getTextField('destination');
        const povField = form.getTextField('pov');
        const povSumField = form.getTextField('povSum');
        const terminalMileageField = form.getTextField('terminalMileage');
        const gasField = form.getTextField('gas');
        const transportCostsField = form.getTextField('transportCosts');
        const totalCostField = form.getTextField('totalCost');

        nameField.setText(name);
        startDateField.setText(startDate);
        endDateField.setText(endDate);
        originField.setText(origin);
        destinationField.setText(destination);
        povField.setText(String(0.625 * zipMiles));
        povSumField.setText(String(0.625 * zipMiles * 2));
        terminalMileageField.setText(String(miles * 0.625));
        gasField.setText(String((endDate - startDate) / 3 * 20));
        transportCostsField.setText(String(rentalPrice));
        totalCostField.setText(String(rentalPrice + (0.625 * miles * 2) + ((endDate - startDate) / 3 * 20)));

        // Read the JPEG file
        const jpegData = fs.readFileSync(__dirname + '/pdf/temp/' + getCurrentDate() + "_air.jpg" );
        const jpegImage = await pdfDoc.embedJpg(jpegData);
        //console.log(jpegImage.width, jpegData.height, jpegData);

        // Add the JPEG image as a page in the PDF document [jpegImage.width, jpegImage.height]
        const jpegPage = pdfDoc.addPage();

        const { width, height } = jpegImage.scale(1);
        console.log(width, height);

        jpegPage.drawImage(jpegImage, {
            x: jpegPage.getWidth() / 2,
            y: jpegPage.getHeight() / 2,
            //width: jpegImage.width,
            //height: jpegImage.height,
        });

        const pdfBytes = await pdfDoc.save();

        // Write the filled PDF to a new file
        fs.writeFileSync(outputPdfPath, pdfBytes);

        console.log('PDF saved');

        return pdfBytes;
    } catch (error) {
        console.error('Error:', error);
        throw error; // Re-throw error to indicate failure
    }
}

// Home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// CTW Generator page
app.get('/ctw', (req, res) => {
    res.sendFile(__dirname + '/public/ctw.html');
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Handle search form submission
app.post('/ctw', async (req, res) => {
    try {
        console.log(req.body);
        
        const name = req.body.name;
        const origin = req.body.origin;
        const destination = req.body.destination;
        const startDate = req.body. startDate;
        const endDate = req.body.endDate;
        const miles = req.body.miles;
        //const rentalPrice = 0; 

        // Scraping flight price
        const flightPrice = await scrapeFlightPrice(querystring.escape(origin), querystring.escape(destination), querystring.escape(startDate), querystring.escape(endDate), name);

        // Scrape Rental
        //const rentalPrice = await scrapeRentalCars(origin, destination, startDate, endDate, name);

        // Generating PDF
        const pdf = await fillPdf(__dirname + '/pdf/CTW.pdf', __dirname + `/pdf/completed/${name}_${getCurrentDate()}`, flightPrice, name, origin, destination, startDate, endDate, miles);

        // Set response headers for PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=' + name + '_' + getCurrentDate() + '.pdf');

        // Send the PDF file as response
        res.send(__dirname + `/pdf/completed/${name}_${getCurrentDate()}`);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(3000, () => {
    console.log('Server is running on port http://localhost:3000');
});