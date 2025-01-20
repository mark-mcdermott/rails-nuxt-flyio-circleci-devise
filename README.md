# Rails-Nuxt-Fly.io-CircleCI MVP App

# Local Preliminary App Setup
1. Create app directory:
    - `mkdir app`
    - `cd app`
2. Initialize git repo:
    - `git init` (hit enter for all prompts)
    - `touch .gitignore`
3. Let's create some blank files for app secrets (like the PostgreSQL connection details) and for non-secret app info.
    - `touch .secrets`
    - `touch .appinfo`
4. Let's add `.secrets` and `.appinfo` to our `.gitignore`:
    - `.gitignore`
    ```
    .secrets
    .appinfo
    ```
5. Choose what your unique front and backend app names will be. If someone else on Fly.io already has an app with the same name, they will ask you to choose a new name. So the more unique, the better. Something like `myuniqueapp001-backend` and `myuniqueapp001-frontend` should do the trick.
6. In `.appinfo` add (replacing the `<...>` parts with the names you chose above):
    ```
    backend app name: <your backend app name>
    frontend app name: <your frontend app name>
    backend app url: https://<your backend app name>.fly.dev
    frontend app url: https://<your frontend app name>.fly.dev
    ```

## Local Frontend Setup (Nuxt)
1. Set up a Nuxt 3 project (from the app's main folder):
    - `npx nuxi@latest init frontend`
      - choose `npm` for package manager
      - choose `no` for initialize git repository
    - `cd frontend`
2. Let's setup our frontend app configuration.
    - `frontend/nuxt.config.ts` (make sure to replace `<...>` with your app backend name)
    ```
    // nuxt.config.ts

    export default defineNuxtConfig({
      server: { port: 3001, host: '0.0.0.0' },
      runtimeConfig: { public: { apiURL: 'http://localhost:3000/api/v1'}},
      $production: { runtimeConfig: { public: { apiURL: 'https://<app backend name>.fly.dev/api/v1' }}},
      devtools: { enabled: false },
    })
    ```
3. Create a simple component and use it in `app.vue`:
    - `mkdir components`
    - `touch components/Hello.vue`
    ```
    <!--- frontend/components/Hello.vue -->
    
    <template>
      <p data-testid="backend-message">{{ message }}</p>
      <p data-testid="frontend-message">Hello from Nuxt!</p>
    </template>

    <script setup>
    import { ref, onMounted } from 'vue';

    const runtimeConfig = useRuntimeConfig()
    const message = ref('');

    onMounted(async () => {
      const response = await fetch(`${runtimeConfig.public.apiURL}/hello`);
      const data = await response.json();
      message.value = data.message;
    });
    </script>
    ```
    - `app.vue`
    ```
    <!--- frontend/app.vue -->
    <template>
      <Hello />
    </template>
    ```
4. Change directory to the app's root directory:
    - `cd ..`

## Local Backend Setup (Rails)

1. Set up Rails API-only backend with RSpec:
    - `rails new backend --api -T -d postgresql`
    - `cd backend`
    - `bundle add rack-cors`
2. in `backend/Gemfile` change line 3 (the ruby version line) to `ruby "~> 3.3"`
3. Create a simple controller:
    - `mkdir -p app/controllers/api/v1`
    - `touch app/controllers/api/v1/hello_controller.rb`
    ```
    # backend/controllers/api/v1/hello_controller.rb

    module Api
      module V1
        class HelloController < ApplicationController
          def index
            render json: { message: 'Hello from Rails!' }
          end
        end
      end
    end
    ```
4. Set the routes:
    ```
    # backend/config/routes.rb

    Rails.application.routes.draw do
      namespace :api do
        namespace :v1 do
          get 'hello', to: 'hello#index'
        end
      end
    end
    ```
5. Set our CORS configuration the backend doesn't block calls from the frontend:
    `config/initializers/cors.rb` (make sure to replace `<...>` with your app frontend name)
    ```
    # backend/config/initializers/cors.rb

    Rails.application.config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins "http://localhost:3001", "https://<app frontend name>.fly.dev"
        resource "*",
          headers: :any,
          methods: [:get, :post, :put, :patch, :delete, :options, :head]
      end
    end
    ```
6. Database setup:
    - Start postgreSQL on your computer (I use the desktop PostgreSQL app) and run it in the background
    - run the database setup:
    ```
    rails db:create db:migrate
    ```
    - or if have a databases called `backend_development` and `backend_test` (like if you've already run through this tutorial before):
    ```
    rails db:drop db:create db:migrate
    ```
7. Change directory to the app's root directory:
    - `cd ..`

## Run App Locally
1. Run the backend server in terminal 1:
    - `cd backend`
    - `rails server`
2. Run the Nuxt app in terminal 2:
    - `cd frontend`
    - `npm run dev` (at `http://localhost:3001` you should see "Hello from Rails!" and "Hello from Nuxt!")
3. Stop the frontend and the backend servers by pressing `command + c` in their respective terminals.

## Deploy To Prod (Fly.io)
- Here we'll deploy our backend and frontend apps to Fly.io.
- In Fly.io, these will be two totally separate apps. We'll have them setup to talk to each other, but they'll be two separate apps listed in your Fly.io apps section.
- When you deploy the backend, there will also be a third app automatically created--your backend PostgreSQL database. This is what we want.
1. Install Fly CLI and log in:
  - `brew install flyctl` (only if `flyctl` is not installed yet)
  - `fly auth login`

### Deploy Frontend
1. In your `frontend/package.json` in the `scripts` section, add this line: `"start": "nuxt start",`
3. Let's add our Fly.io configuration file, mostly, so it won't ask us what the app name and region are when we `fly launch`--it's a little faster this way. Make sure to replace `<...>` with your app frontend name. Also replace `dfw` in the `primary_region` with [your region code](https://fly.io/docs/reference/regions/).
    - `touch fly.toml`
    ```
    # frontend/fly.toml

    app = '<app frontend name>'
    primary_region = 'dfw'

    [build]

    [http_service]
      internal_port = 3001
      force_https = true
      auto_stop_machines = 'stop'
      auto_start_machines = true
      min_machines_running = 0
      processes = ['app']

    [[vm]]
      memory = '1gb'
      cpu_kind = 'shared'
      cpus = 1
    ```
4. `fly launch`
    - When it asks, "A fly.toml file was found. Would you like to copy its configuration to the new app?", press `y`
    - When it asks, "Do you want to tweak these settings before proceeding?", press `N` or enter
    - When it asks, "Create .dockerignore from 1 .gitignore files?", press `y`
    - When `fly launch` if finished, look at the output for "Visit your newly deployed app at `<url>`" and copy/paste the url into the "frontend app url" line of your `.appinfo`
5. Go to your frontend app url in a browser.
    - You should see "Hello from Nuxt!", but not "Hello from Rails!"
    - In the console, there will be a 404 response from the request to the backend (becuase they backend's not deployed yet)
6. `cd ..` into the app's root directory

### Deploy Backend
1. `cd backend`
2. We'll start by deleting the Docker files that Rails creates with `rails new`:
    - `rm Dockerfile`
    - `rm .dockerignore`
3. Let's create our backend `fly.toml` file, our Fly.io configuration file for our backend, mostly, so it won't ask us what the app name and region are when we `fly launch`--it's a little faster this way. Make sure to replace `<...>` with your app backend name. Also replace `dfw` in the `primary_region` with [your region code](https://fly.io/docs/reference/regions/).
    - `touch fly.toml`
    ```
    # backend/fly.toml

    app = '<app backend>'
    primary_region = 'dfw'
    console_command = '/rails/bin/rails console'

    [build]

    [deploy]
      release_command = './bin/rails db:prepare'

    [http_service]
      internal_port = 3000
      force_https = true
      auto_stop_machines = 'stop'
      auto_start_machines = true
      min_machines_running = 0
      processes = ['app']

    [[vm]]
      memory = '1gb'
      cpu_kind = 'shared'
      cpus = 1

    [[statics]]
      guest_path = '/rails/public'
      url_prefix = '/'
    ```
4. Deploy the backend:
  - `fly launch`
    - It’ll ask you some questions:
      - "An existing fly.toml file was found. Would you like to copy its configuration to the new app?" Answer `y`
      - "Do you want to tweak these settings before proceeding?" Answer `N` or hit enter
      - "Overwrite fly.toml?" Answer `n`
    - After this, the deployment starts. It can take a few minutes to finish and a lot of output will scroll down your screen like the Matrix. Watch this output--some of it's important.
      - Watch the output and look for the "Postgres cluster details", which end with the line, "Save your credentials in a secure place -- you won't be able to see them again!" When you see it, copy and paste this section to your `.secrets` file.
5. Go to your *frontend* app url in a browser.
    - You should see "Hello from Nuxt!" *and* "Hello from Rails!"
    - In the console, there should be no 404 errors
6. `cd ..` into the app's root directory

# RSpec
Here we'll create a simple RSpec test for the Rails HelloController. Then we'll verify it passes when running locally.
1. Install RSpec:
    - `cd backend`
    - `bundle add rspec-rails --group "development, test"`
    - `rails generate rspec:install`
2. Create a HelloController test:
    - `mkdir -p spec/requests/api/v1`
    - `touch spec/requests/api/v1/hello_spec.rb`
    ```
    # backend/spec/requests/api/v1/hello_spec.rb

    # frozen_string_literal: true

    require 'rails_helper'

    RSpec.describe "Api::V1::Hello", type: :request do
      describe "GET /api/v1/hello" do
        it "returns a JSON message from the hello controller" do
          get "/api/v1/hello"
          expect(response).to have_http_status(:ok)

          json_body = JSON.parse(response.body)
          expect(json_body["message"]).to eq("Hello from Rails!")
        end
      end
    end
    ```
3. Run RSpec locally:
    - `rspec` (1 test should run and pass)
4. Let's redeploy our backend now and check rspec in prod:
    - `fly deploy`
    - `fly ssh`
      - `rpsec`
      - `exit`
