# Node js script to fetch conversation history from Kore platform

The conversation history for a bot can be retrieved using the public conversation history api provided by Kore bots platform. 
The output of this script is a csv file which can be sent over email using Google's gmail apis.

In order to use this script, you need to provide the required configurations in the config.json file. 
As part of the configuration, you will need to use the jwt token for authentication after enabling the API scope from the bot builder. 
The steps to generate the jwt token can be referred here: https://developer.kore.ai/docs/bots/api-guide/apis/ 

The script also fetches and writes the custom meta tags available as part of the user profile. chatHistory.js file needs to be updated with the required custom metatags as per the use case.

#Usage

Execute the chatHistory.js file with the command node chatHistory.js from command line. The output file will be stored in the same directory as the script.
