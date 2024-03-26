### Running the project

Download Key:

```
wget https://dl-ssl.google.com/linux/linux_signing_key.pub -O /tmp/google.pub
```

Make a keyring for chrome:

```
gpg --no-default-keyring --keyring /etc/apt/keyrings/google-chrome.gpg --import /tmp/google.pub
```

Set repository:

```
echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main' | sudo tee /etc/apt/sources.list.d/google-chrome.list
```

Install package:

```
sudo apt-get update
sudo apt-get install google-chrome-stable

```

Open the terminal and run:

```
cd test-project
npm install
```

After installing the dependencies, run:
```
npm start
```

Or just press the *Run Code* button found in the top right of the editor panel.
### Want to contribute?
