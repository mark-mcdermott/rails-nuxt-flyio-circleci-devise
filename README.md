# Rails-Nuxt-Fly.io-CircleCI MVP App

# Local Preliminary App Setup
1. Create app directory:
    - `mkdir app`
    - `cd app`
2. Initialize git repo:
    - `git init` (hit enter for all prompts)
3. Let's create some blank files for app secrets (like the PostgreSQL connection details) and for non-secret app info.
    - `touch .gitignore .secrets .appinfo`
4. Let's add `.secrets` and `.appinfo` to our `.gitignore`:
    - `.gitignore`
    ```
    .secrets
    .appinfo
    ```
5. Choose what your unique front and backend app names will be. If someone else on Fly.io already has an app with the same name, they will ask you to choose a new name. So the more unique, the better. Something like `myuniqueapp001-backend` and `myuniqueapp001-frontend` should do the trick.
6. In `.appinfo` add *(replacing the `<...>` parts with the names you chose above)*:
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
3. Create a simple component and use it in `app.vue`:
    - `mkdir components`
    - `touch components/Hello.vue`
    ```
    <!--- frontend/components/Hello.vue -->

    <template>
      <p data-testid="frontend-message">Hello from Nuxt!</p>
    </template>
    ```
    - `app.vue`
    ```
    <!--- frontend/app.vue -->
    <template>
      <Hello />
    </template>
    ```

### Vitest (Local)
We'll setup Vitest here for component tests.
1. Install Vitest and testing dependencies:
    - `npm i --save-dev @nuxt/test-utils vitest @vue/test-utils happy-dom playwright-core`
2. Change your `nuxt.config.ts` to this:
    ```
    // frontend/nuxt.config.ts

    export default defineNuxtConfig({
      modules: ['@nuxt/test-utils/module']
    })
    ```
3. Create a `vitest.config.ts`:
    - `touch vitest.config.ts`
    ```
    // frontend/vitest.config.ts

    import { defineVitestConfig } from '@nuxt/test-utils/config'

    export default defineVitestConfig({ })
    ```
4. Let's create our test directory and test file:
    - `mkdir -p spec/components`
    - `touch spec/components/hello.nuxt.spec.ts`
    ```
    // frontend/spec/components/hello.nuxt.spec.ts

    import { it, expect } from 'vitest'
    import { mountSuspended } from '@nuxt/test-utils/runtime'
    import { Hello } from '#components'

    it('can mount some component', async () => {
        const component = await mountSuspended(Hello)
        expect(component.text()).toMatchInlineSnapshot(
            '"Hello from Nuxt!"'
        )
    })
    ```
5. Run Vitest:
    - `npx vitest spec/components` (1 test should pass)

## Vitest Docker
1. Let's create our `Dockerfile`:
    - `touch Dockerfile`
    ```
    # frontend/Dockerfile
    FROM node:18
    WORKDIR /app
    COPY package.json package-lock.json ./
    RUN npm ci
    COPY . .
    RUN npm install -g vitest
    CMD ["npx", "vitest", "spec/components"]
    ```
2. Let's build the Docker image and run the container:
  - `docker build -t nuxt-vitest .`
  - `docker run --rm nuxt-vitest`
3. `cd ..`

## Vitest CircleCI
Now from the root directory of our app, let's setup Vitest for CircleCI.
1. Let's create a `docker-compse.yml` file:
    - `touch docker-compose.yml`
    ```
    # docker-compose.yml

    services:
      nuxt-vitest:
        build:
          context: ./frontend
        command: npx vitest spec/components
        working_dir: /app
    ```
2. Let's create a `.circleci/config.yml`, the config file for CircleCI:
    - `mkdir .circleci`
    - `touch .circleci/config.yml`
    ```
    jobs:
      vitest:
        docker:
          - image: cimg/node:18.18
        steps:
          - checkout
          - run:
              name: Install dependencies
              command: cd frontend && npm ci
          - run:
              name: Generate Nuxt files
              command: cd frontend && npx nuxi prepare
          - run:
              name: Run Vitest
              command: cd frontend && npx vitest spec/components

    workflows:
      version: 2
      test_workflow:
        jobs:
          - vitest
    ```
3. Let's commit these changes and push them:
    - `git add .`
    - `git commit -m "Add Vitest"`
    - `git push`
    - Then the tests will start on CircleCI
    - The `vitest` step should show green with one test passing

## Tweak Frontend To Talk To Backend
1. Let's configure our `nuxt.config.ts` to talk to the backend:
    - `cd frontend`
    - `frontend/nuxt.config.ts` *(make sure to replace `<...>` with your app backend name)*
    ```
    // frontend/nuxt.config.ts

    export default defineNuxtConfig({
      server: { port: 3001, host: '0.0.0.0' },
      runtimeConfig: { public: { apiURL: 'http://localhost:3000/api/v1'}},
      $production: { runtimeConfig: { public: { apiURL: 'https://<app backend name>.fly.dev/api/v1' }}},
      modules: ['@nuxt/test-utils/module']
    })
    ```
2. Let's make our component talk to the backend as well:
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
3. Let's update our component test to match the new html:
    ```
    // frontend/spec/components/hello.nuxt.spec.ts

    import { it, expect, vi } from 'vitest'
    import { mountSuspended } from '@nuxt/test-utils/runtime'
    import { Hello } from '#components'

    global.fetch = vi.fn(() =>
        Promise.resolve({
            json: () => Promise.resolve({ message: 'Hello from Rails!' }),
        })
    )

    it('can mount some component', async () => {
        const component = await mountSuspended(Hello)
        expect(component.html()).toMatchInlineSnapshot(`
            "<p data-testid="backend-message">Hello from Rails!</p>
            <p data-testid="frontend-message">Hello from Nuxt!</p>"
          `)
    })
    ```
3. Before we setup the backend, let's double check Vitest is still passing locally, on local Docker and on CircleCI.
    - locally:
      - `npx vitest spec/components` (1 test should pass)
    - local docker:
      - `cd ..`
      - `docker-compose build`
      - `docker-compose up`
    - CircleCI:
      - `git add .`
      - `git commit -m "Setup frontend to talk to backend"`
      - `git push`
      - Check the CircleCI build (1 test should pass)

## Local Backend Setup (Rails)

1. Set up Rails API-only backend with RSpec:
    - `rails new backend --api -T -d postgresql`
    - `cd backend`
    - `rm -rf .git`
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
    `config/initializers/cors.rb` *(make sure to replace `<...>` with your app frontend name)*
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
3. Let's add our Fly.io configuration file, mostly, so it won't ask us what the app name and region are when we `fly launch`--it's a little faster this way. *Make sure to replace `<...>` with your app frontend name.* Also replace `dfw` in the `primary_region` with [your region code](https://fly.io/docs/reference/regions/).
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
    - When `fly launch` if finished, look at the output for "Visit your newly deployed app at `<url>`" and copy/paste the url into the "frontend app url" line of your `.appinfo`
5. Go to your frontend app url in a browser.
    - You should see "Hello from Nuxt!", but not "Hello from Rails!"
    - In the console, there will be a failed request to the backend (becuase they backend's not deployed yet)
6. `cd ..` into the app's root directory

### Deploy Backend
1. `cd backend`
2. We'll start by deleting the Docker files that Rails creates with `rails new`:
    - `rm Dockerfile`
    - `rm .dockerignore`
3. Let's create our backend `fly.toml` file, our Fly.io configuration file for our backend, mostly, so it won't ask us what the app name and region are when we `fly launch`--it's a little faster this way. *Make sure to replace `<...>` with your app backend name.* Also replace `dfw` in the `primary_region` with [your region code](https://fly.io/docs/reference/regions/).
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
      - After this, the deployment starts. It can take a few minutes to finish and a lot of output will scroll down your screen like the Matrix. Watch this output--some of it's important.
      - Watch the output and look for the "Postgres cluster details", which end with the line, "Save your credentials in a secure place -- you won't be able to see them again!" When you see it, copy and paste this section to your `.secrets` file.
      - When it asks, "Overwrite entrypoint?", press 'n'
      - When it asks, "Overwrite fly.toml?", press 'n'
5. Go to your **frontend** app url in a browser.
    - You should see "Hello from Nuxt!" *and* "Hello from Rails!"
    - In the console, there should be no 404 errors
6. `cd ..` into the app's root directory

## Playwright (Local)
1. First we'll install Playwright:
    - `cd frontend`
    - `npm install -D @playwright/test`
    - `npx playwright install`
2. Then we'll configure Playwright:
    - `touch playwright.config.ts`
    ```
    // frontend/playwright.config.ts

    import { defineConfig } from '@playwright/test';

    export default defineConfig({
      testDir: './spec/e2e',
      use: {
        baseURL: 'http://localhost:3001',
        browserName: 'chromium',
        headless: true, // Change to `false` to see the browser in action
      },
      webServer: {
        command: 'npm run dev',
        port: 3001,
        reuseExistingServer: true,
      },
    });
    ```
3. Now we'll create our Playwright test:
    - `mkdir spec/e2e`
    - `touch spec/e2e/hello.spec.ts`
    ```
    // frontend/e2e/hello.spec.ts

    import { test, expect } from '@playwright/test';

    test('frontend and backend are working', async ({ page }) => {
      // Navigate to the frontend URL
      await page.goto('/');

      // Verify the frontend message
      await expect(page.locator('[data-testid="frontend-message"]')).toHaveText('Hello from Nuxt!');

      // Verify the backend message
      await expect(page.locator('[data-testid="backend-message"]')).toHaveText('Hello from Rails!');
    });
    ```
4. Now run Playwright locally:
    - In a terminal pane in the backend directory, run `rails server`
    - In a terminal pane in the frontend directory, run `npm run dev`
    - In another terminal pane in the frontend directory, run `npx playwright test spec/e2e` (1 test should pass)
    - Stop the first two terminal panes with control + c.

## Playwright Docker
I was unable to get playwright working on docker on my computer. I ran into issues with ARM64 incompatability with the appropriate Docker images and wasn't able to figure out a way around them. So we'll skip this part.

## Playwright On CircleCI
1. From the root directory of our app, let's change our `docker-compose.yml` to include a Playwright section:
    ```
    jobs:
      test_backend:
        docker:
          - image: ruby:3.3.7-bullseye
            environment:
              RAILS_ENV: test
              DATABASE_URL: postgres://postgres:yourpassword@db:5432/backend_test
              DB_HOST: db
          - image: postgres:13.4
            name: db
            environment:
              POSTGRES_USER: postgres
              POSTGRES_DB: backend_test
              POSTGRES_PASSWORD: yourpassword
        steps:
          - checkout

          - restore_cache:
              keys:
                - v1-backend-dependencies-{{ checksum "backend/Gemfile.lock" }}
                - v1-backend-dependencies-

          - run:
              name: Install System Dependencies
              command: |
                apt-get update
                apt-get install -y build-essential libpq-dev

          - run:
              name: Install Bundler
              command: gem install bundler

          - run:
              name: Install Gems
              command: |
                cd backend
                bundle config set path 'vendor/bundle'
                bundle install --jobs=4 --retry=3

          - save_cache:
              paths:
                - backend/vendor/bundle
              key: v1-backend-dependencies-{{ checksum "backend/Gemfile.lock" }}

          - run:
              name: Setup Database
              command: |
                cd backend
                bundle exec rails db:setup

          - run:
              name: Run RSpec Tests
              command: |
                cd backend
                bundle exec rspec

      test_frontend:
        docker:
          - image: node:18
        steps:
          - checkout

          - restore_cache:
              keys:
                - v1-frontend-dependencies-{{ checksum "frontend/package-lock.json" }}
                - v1-frontend-dependencies-

          - run:
              name: Install Node.js Dependencies
              command: |
                cd frontend
                npm ci

          - save_cache:
              paths:
                - frontend/node_modules
              key: v1-frontend-dependencies-{{ checksum "frontend/package-lock.json" }}

          - run:
              name: Run Vitest Tests
              command: |
                cd frontend
                npx vitest run spec/components

      test_playwright:
        docker:
          - image: mcr.microsoft.com/playwright:latest
        steps:
          - checkout

          - restore_cache:
              keys:
                - v1-frontend-dependencies-{{ checksum "frontend/package-lock.json" }}
                - v1-frontend-dependencies-

          - run:
              name: Install Node.js Dependencies
              command: |
                cd frontend
                npm ci

          - save_cache:
              paths:
                - frontend/node_modules
              key: v1-frontend-dependencies-{{ checksum "frontend/package-lock.json" }}

          - run:
              name: Start Backend Server
              command: |
                cd backend
                rails server -p 3000 &

          - run:
              name: Start Playwright Tests
              command: |
                cd frontend
                npx playwright test spec/e2e 

    workflows:
      version: 2
      test:
        jobs:
          - test_backend
          - test_frontend
          - test_playwright
    ```
2. Let's commit these changes, push them up and run Playwright on CircleCI:
    - `git add .`
    - `git commit -m "Add Playwright"`
    - `git push`
    - That should start the tests running and now RSpec, Vitest and Playwright should all pass and show green.

# RSpec (Local)
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
4. Let's redeploy our backend now
    - `fly deploy`
5. `cd ..`

# RSpec On Local Docker
1. In the root directory of our app, let's create a `docker-compose.yml`:
    - `touch docker-compose.yml`
    ```
    services:
      db:
        image: postgres:13.4
        environment:
          POSTGRES_USER: postgres
          POSTGRES_DB: backend_test
          POSTGRES_PASSWORD: yourpassword  # Replace with a strong password
        ports:
          - "5432:5432"
        volumes:
          - db_data:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U postgres"]
          interval: 10s
          timeout: 5s
          retries: 5

      backend:
        image: ruby:3.3.7-bullseye
        environment:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:yourpassword@db:5432/backend_test
          DB_HOST: db
        volumes:
          - ./backend:/app/backend
        working_dir: /app/backend
        command: bash -c "bundle config set path 'vendor/bundle' && bundle install --jobs=4 --retry=3 && tail -f /dev/null"
        depends_on:
          db:
            condition: service_healthy

      frontend:
        image: node:18-alpine
        environment:
          NODE_ENV: test
        volumes:
          - ./frontend:/app/frontend
        working_dir: /app/frontend
        command: sh -c "npm install && tail -f /dev/null"
        depends_on:
          db:
            condition: service_healthy

    volumes:
      db_data:
    ```
2. In `backend/config/database.yml`, change the default setting to:
    ```
    default: &default
      adapter: postgresql
      encoding: unicode
      pool: <%= ENV.fetch("RAILS_MAX_THREADS") { 5 } %>
      username: <%= ENV.fetch("DB_USERNAME", "postgres") %>
      password: <%= ENV.fetch("DB_PASSWORD", "yourpassword") %>
      host: <%= ENV.fetch("DB_HOST", "localhost") %>
    ```
3. Run RSpec locally on Docker:
    - `docker-compose down --volumes --remove-orphans`
    - `docker-compose up`
    - When the above command finshes, leave that terminal pane open and open a second
      - In the second terminal pane:
        - `docker-compose exec backend bundle install`
        - `docker-compose exec backend bundle exec rspec` (1 test should pass)
      
4. Make sure RSpec still works locally:
    - `cd backend`
    - `rspec` (you should see `1 example, 0 failures` here, too)
    - `cd ..`

## RSpec On CircleCI
1. Let's create a `.circleci/config.yml` file, the file CircleCI uses for our CI/CD configuration:
    - `mkdir .circleci`
    - `touch .circleci/config.yml`
    ```
    version: 2.1

    jobs:
      test:
        docker:
          - image: ruby:3.3.7-bullseye
            environment:
              RAILS_ENV: test
              DATABASE_URL: postgres://postgres:yourpassword@db:5432/backend_test
              DB_HOST: db
          - image: postgres:13.4
            name: db
            environment:
              POSTGRES_USER: postgres
              POSTGRES_DB: backend_test
              POSTGRES_PASSWORD: yourpassword
        steps:
          - checkout
          - restore_cache:
              keys:
                - v1-dependencies-{{ checksum "backend/Gemfile.lock" }}
                - v1-dependencies-
          
          - run:
              name: Install System Dependencies
              command: |
                apt-get update
                apt-get install -y build-essential libpq-dev

          - run:
              name: Install Bundler
              command: gem install bundler

          - run:
              name: Install Gems
              command: |
                cd backend
                bundle config set path 'vendor/bundle'
                bundle install --jobs=4 --retry=3

          - save_cache:
              paths:
                - backend/vendor/bundle
              key: v1-dependencies-{{ checksum "backend/Gemfile.lock" }}

          - run:
              name: Setup Database
              command: |
                cd backend
                bundle exec rails db:setup

          - run:
              name: Run RSpec Tests
              command: |
                cd backend
                bundle exec rspec

    workflows:
      version: 2
      test:
        jobs:
          - test
    ```
2. You'll need to deploy the whole app to github.
    - `git add .`
    - `git commit -m "Add app"`
    - Create a new public repo in the github UI
    - `git branch -M main`
    - From the github UI, get the repo's "web url" (the url that ends in `.git`, like `https://github.com/mark-mcdermott/testingtestinghaaay.git`)
    - `git remote add origin <repo web url>`
    - `git push -u origin main`
3. Configure CircleCI for the new repo
    - Login to CircleCI
    - Click the "Go to application" button
    - Click "Projects" in the left sidebar
    - Find your new repo in the Project list
    - In your repo's project row, click "Set up Project" towards the right.
    - The "Select your config.yml file" modal shows and "Fastest" is already the selected radio option
    - In the "From which branch" field under "Fastest", type `main`
    - Click the "Set up Project" button on the modal.
    - This will take you to your new repo's "Pipeline" and a run will have started
    - You can watch the run and when it's finished, the RSpec test should have passed and everything should be green.




    version: 2.1

    jobs:
      test_backend:
        docker:
          - image: ruby:3.3.7-bullseye
            environment:
              RAILS_ENV: test
              DATABASE_URL: postgres://postgres:yourpassword@db:5432/backend_test
              DB_HOST: db
          - image: postgres:13.4
            name: db
            environment:
              POSTGRES_USER: postgres
              POSTGRES_DB: backend_test
              POSTGRES_PASSWORD: yourpassword
        steps:
          - checkout
          
          - restore_cache:
              keys:
                - v1-backend-dependencies-{{ checksum "backend/Gemfile.lock" }}
                - v1-backend-dependencies-

          - run:
              name: Install System Dependencies
              command: |
                apt-get update
                apt-get install -y build-essential libpq-dev

          - run:
              name: Install Bundler
              command: gem install bundler

          - run:
              name: Install Gems
              command: |
                cd backend
                bundle config set path 'vendor/bundle'
                bundle install --jobs=4 --retry=3

          - save_cache:
              paths:
                - backend/vendor/bundle
              key: v1-backend-dependencies-{{ checksum "backend/Gemfile.lock" }}

          - run:
              name: Setup Database
              command: |
                cd backend
                bundle exec rails db:setup

          - run:
              name: Run RSpec Tests
              command: |
                cd backend
                bundle exec rspec

      test_frontend:
        docker:
          - image: node:18
        steps:
          - checkout

          - restore_cache:
              keys:
                - v1-frontend-dependencies-{{ checksum "frontend/package-lock.json" }}
                - v1-frontend-dependencies-

          - run:
              name: Install Node.js Dependencies
              command: |
                cd frontend
                npm ci

          - save_cache:
              paths:
                - frontend/node_modules
              key: v1-frontend-dependencies-{{ checksum "frontend/package-lock.json" }}

          - run:
              name: Run Vitest Tests
              command: |
                cd frontend
                npx vitest run spec/components

    workflows:
      version: 2
      test:
        jobs:
          - test_backend
          - test_frontend
    ```
2. Let's commit these changes and push them:
    - `git add .`
    - `git commit -m "Add Vitest"`
    - `git push`
    - Then the tests will start on CircleCI
    - Both `test_frontend` (Vitest) and `test_backend` (RSpec) should pass