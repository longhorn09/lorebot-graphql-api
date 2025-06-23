# lorebot-graphql-api
Backend microservice in NodeJS using GraphQL and CloudSQL database


## Dependencies

Dependencies will be automatically installed with `npm install` but to install discretely run following
```
npm install @apollo/server @google-cloud/cloud-sql-connector dotenv graphql graphql-tag mysql2 express
```

## .env
`.env` file for use with `dotenv` should be structured in below fashion.
Generally `DB_PAGESIZE` should be kept at `3` to stay within Discord messaging limits.
There's an existing example.env as a boilerplate, in Linux command line perform following command:
```
cp env.template .env
```

`dotenv` is a design decision favored over `config.json` 

## CloudSQL API enablement
Run following in Cloud Shell to enable requisite APIs
```
gcloud services enable compute.googleapis.com sqladmin.googleapis.com \
  run.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com servicenetworking.googleapis.com
```

## GCP specific setup
Replace ${GOOGLE_CLOUD_PROJECT} with name of your project

### Common error(s)
If receiving a `NO_ADC_FOUND` error, need to setup the application default credentials `ADC`
```
gcloud init --console-only
gcloud auth application-default login --no-browser
```

### Service account creation and policy setup
```
gcloud iam service-accounts create lorebot_service_account_name_here \
	--display-name "Lorebot service account"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.instanceUser"

gcloud projects add-iam-policy-binding ${GOOGLE_CLOUD_PROJECT} \
  --member="serviceAccount:quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
  ```



### Database service account user setup
```
gcloud sql users create quickstart-service-account@${GOOGLE_CLOUD_PROJECT}.iam.gserviceaccount.com --instance=database_instance_here --type=cloud_iam_service_account
```
  
