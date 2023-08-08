const { Configuration, OpenAIApi } = require('openai');
import { SSE } from 'sse.js';


let apiKey;
let openaiClient;

chrome.storage.local.get(['openaiApiKey'])
    .then(({ openaiApiKey }) => {
        const configuration = new Configuration({
            apiKey: openaiApiKey
        })
        openaiClient = new OpenAIApi(configuration);
        apiKey = openaiApiKey;
    })
// add listener for API key changes and update OpenAI config on changes
chrome.storage.onChanged.addListener((changes) => {
    for (let [key, { newValue }] of Object.entries(changes)) {
        if (key !== 'openaiApiKey') continue;
        openaiClient = new OpenAIApi({
            apiKey: new Configuration({
                apiKey: newValue,
            })
        })
    }
})

setInterval(() => {
    const gmailForms = document.querySelectorAll('div[g_editable]');
    const newMessageDiv = document.querySelector('div[aria-label="New Message"]');
    let ariaLabel;
    for (const form of gmailForms) {

        if (
            form.parentNode &&
            form.parentNode.querySelector('#email-assistant-button') === null
        ) {

            const prevMessages = document.querySelectorAll('div[data-message-id]');
            if (prevMessages && prevMessages.length > 0) {
                const lastMessage = prevMessages[prevMessages.length - 1];
                const lastMessageText = lastMessage.innerText.trim();

                // Split the text into lines and remove the header part
                const lines = lastMessageText.split('\n');
                let startIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('to me')) {
                        startIndex = i + 1;
                        break;
                    }
                }

                const trimmedText = lines.slice(startIndex).join('\n');
                ariaLabel = newMessageDiv ? newMessageDiv.getAttribute('aria-label') : '';
                console.log('continuous message inside interval');
                console.log({ ariaLabel })
                return attachAssistantButton(form, trimmedText, ariaLabel);

            }
            ariaLabel = newMessageDiv ? newMessageDiv.getAttribute('aria-label') : '';
            console.log('new message inside interval');
            console.log({ ariaLabel })
            return attachAssistantButton(form, '', ariaLabel);
        }
    }
}, 1000);


const attachAssistantButton = (node, responseEmail, ariaLabel) => {
    console.log('aria-label attach button: ', ariaLabel)

    const buttonText = ariaLabel !== 'New Message' ? 'Email Reply Generator' : 'Email Generator';
    const prompt = ariaLabel !== 'New Message' ? `Reply to the following email: ${responseEmail}` : 'Continue writing the following email: \n"' + node.textContent + '"';

    console.log({ buttonText })
    console.log({ prompt })

    node.insertAdjacentHTML(
        'beforebegin',
        `<div id="email-assistant-button" class="assistant-btn">
            ${buttonText}
        </div>`,
    )

    // add a click event 
    node.parentNode
        .querySelector('#email-assistant-button')
        .addEventListener('click', async () => {
            // if (!openaiClient) return;
            // const completion = await openaiClient.createCompletion({
            //     model: 'text-davinci-003',
            //     prompt: prompt,
            //     temperature: 0.6,
            //     max_tokens: 200
            // })
            // node.textContent += ' ' + completion.data.choices[0].text;
            const openaiParameters = {
                model: 'text-davinci-003',
                prompt: prompt,
                temperature: 0.6,
                max_tokens: 200,
                stream: true
            }
            const sse = new SSE('https://api.openai.com/v1/completions', {
                headers: {
                    Authorization: 'Bearer ' + apiKey,
                    Accept: 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                payload: JSON.stringify(openaiParameters),
                method: 'POST',
            });
            sse.addEventListener('message', (res) => {
                if (res.data === '[DONE]') {
                    sse.close();
                    return;
                }
                node.textContent += JSON.parse(res.data).choices[0].text;
            })
            sse.addEventListener('error', (err) => console.log('Completion action SSE error: ', err));
            sse.stream();
        })
}