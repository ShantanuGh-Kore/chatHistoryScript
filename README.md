# chatHistoryScript
Script to get the entire chat history dump for a given date range using Bot Sessions and Chat History API enabled from API scopes from Bot Builder.

# Prequisites:
In order to execute the script following needs to be setup:
1. Install node js
2. Install the node modules by running "npm install"
3. Enable API scope for the bot

# Steps to enable API scope
1. From the bot builder, navigate to API Extensions
2. Click on API Scopes -> New
3. Click on Manage Apps
4. Create a new app
5. Select the new app created (copy the Client ID and Client Secret, we will need this to create the JWT)
4. Select Chat History and Bot Sessions from the list
5. Click on Save
6. Publish the bot

# Generate JWT
1. Open jwt.io
2. On the right hand side panel under Payload: Data section, add the following:
  {
  "appId": "<Client ID>"
  }
3. Under Verify Signature, use the Client secret for signature.
4. Use the JWT generated under encoded section to update jwt in the config.json
  
# Update config.json
In the config.json, add the bot stream id under "streamId" and add the jwt generated above under "jwt"

# Execute the script
To execute the script, run the following command in your terminal: node chatHistory.js

