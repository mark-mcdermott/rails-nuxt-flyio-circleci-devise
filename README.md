# Barebones Rails, Nuxt and Fly.io Tutorial
### With RSpec, Vitest, Playwright, CircleCI & Devise
Here we’ll make a MVP (“minimum viable product”) of a rails API-only backend with rspec tests that talks to a nuxt frontend with vitest component tests and playwright end-to-end tests. We'll use Devise for auth.

Prereqs (stuff you'll need installed that I don't go over here):
- Postgres
- Desktop Docker
- Rails, Nuxt, Ruby, Node, NPM, Bundler

# Part I: Wiring Things Together: Rails, RSpec, Nuxt, Vitest, Playwright, CircleCI and Fly.io
 This part will have close to no functionality and no styling, but everything will be wired together correctly and all three test suites will pass when run locally or on CircleCI.

## Local Preliminary App Setup
1. Create app directory:
    - `mkdir app`
    - `cd app`
2. Initialize git repo:
    - `git init`
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
2. Create a simple component and use it in `app.vue`:
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
3. Run the Nuxt app locally:
    - `npm run dev` (at `http://localhost:3000` you should see "Hello from Nuxt!")
4. Stop the server by pressing `command + c`.

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
    - `cd ..`

## Vitest Docker
1. From the root directory of our app, let's create a `docker-compse.yml` file:
    - `touch docker-compose.yml`
    ```
    # docker-compose.yml

    services:

      vitest:
        image: cimg/node:18.18
        working_dir: /app/frontend
        command: bash -c "npm ci && npx nuxi prepare && npx vitest spec/components"
        volumes:
          - .:/app
    ```
2. Let's run Vitest on our local Docker setup:
  - `docker-compose run --rm vitest`

## Vitest CircleCI
Now from the root directory of our app, let's setup Vitest for CircleCI.
1. Let's create a `.circleci/config.yml`, the config file for CircleCI:
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
3. You'll need to deploy the whole app to github.
    - `git add .`
    - `git commit -m "Add Vitest"`
    - Create a new public repo in the github UI
    - From the github UI, get the repo's "web url" (the url that ends in `.git`, like `https://github.com/mark-mcdermott/testingtestinghaaay.git`)
    - `git remote add origin <repo web url>`
    - `git push -u origin main`
4. Configure CircleCI for the new repo
    - Login to CircleCI
    - Click the "Go to application" button
    - Click "Projects" in the left sidebar
    - Find your new repo in the Project list
    - In your repo's project row, click "Set up Project" towards the right.
    - The "Select your config.yml file" modal shows and "Fastest" is already the selected radio option
    - In the "From which branch" field under "Fastest", type `main`
    - Click the "Set up Project" button on the modal.
    - This will take you to your new repo's "Pipeline" and a run will have started
    - You can watch the run and when it's finished, the Vitest step should have passed and everything should be green.

## Tweak Frontend To Talk To Backend
1. Let's configure our `nuxt.config.ts` to talk to the backend:
    - `cd frontend`
    - `frontend/nuxt.config.ts` *(make sure to replace `<...>` with your app backend name)*
    ```
    // frontend/nuxt.config.ts

    export default defineNuxtConfig({
      devServer: { port: 3001, host: '0.0.0.0' },
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
      - `npm install` (shouldn't be necessary here, but it is for me or I get architecture errors here)
      - `npx vitest spec/components` (1 test should pass)
    - local docker:
      - `cd ..`
      - `docker-compose build`
      - `docker-compose up`  (1 test should pass)
    - CircleCI:
      - `git add .`
      - `git commit -m "Setup frontend to talk to backend"`
      - `git push`
      - Check the CircleCI build (vitest section should be green and passing)

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
    - `npm install` (shouldn't be necessary, but is for me or I get architecture errors here)
    - `npm run dev` (at `http://localhost:3001` you should see "Hello from Rails!" and "Hello from Nuxt!")
      - If you only see "Hello from Nuxt!" and not "Hello from Rails!", don't panic. In my experience, sometimes the backend starts up properly right away and other times it can take about 5 minutes.
3. Stop the frontend and the backend servers by pressing `command + c` in their respective terminals.

## Deploy To Prod (Fly.io)
- Here we'll deploy our backend and frontend apps to Fly.io.
- In Fly.io, these will be two totally separate apps. We'll have them setup to talk to each other, but they'll be two separate apps listed in your Fly.io apps section.
- When you deploy the backend, there will also be a third app automatically created--your backend PostgreSQL database. This is what we want.
1. Install Fly CLI and log in:
  - `brew install flyctl` (only if `flyctl` is not installed yet)
  - `fly auth login`

### Deploy Frontend
1. `cd frontend`
2. In your `frontend/package.json` in the `scripts` section, add this line: `"start": "nuxt start",`
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
    // frontend/spec/e2e/hello.spec.ts

    import { test, expect } from '@playwright/test';

    test('frontend and backend are working', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('[data-testid="frontend-message"]')).toHaveText('Hello from Nuxt!');
      await expect(page.locator('[data-testid="backend-message"]')).toHaveText('Hello from Rails!');
    });
    ```
4. Now run Playwright locally:
    - In a terminal pane in the backend directory, run `rails server`
    - In a terminal pane in the frontend directory, run `npm run dev`
    - In another terminal pane in the frontend directory, run `npx playwright test spec/e2e` (1 test should pass)
    - Stop the first two terminal panes with control + c.

## Playwright Docker
I was unable to get playwright working on docker on my computer. I ran into issues with ARM64 incompatability with the appropriate Docker images and wasn't able to figure out a way around them. **So just skip this part**.

But if you're feeling intrepid, changing the `docker-compose.yml` to something like this might get you partway there:

```
# docker-compose.yml

services:

  playwright:
    image: cimg/ruby:3.3-node
    working_dir: /app/frontend
    command: |
      apt-get update && apt-get install -y \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
      libxcomposite1 libxdamage1 libgbm1 libpango-1.0-0 libxrandr2 \
      libcups2 libdrm2 libxshmfence1 libasound2 && \
      npm ci && npx playwright install && npx playwright test spec/e2e
    depends_on:
      - nuxt
    volumes:
      - .:/app

  db:
    image: postgres:13
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  rails:
    image: cimg/ruby:3.3-node
    working_dir: /app/backend
    environment:
      RAILS_ENV: test
    command: bundle install && rails server -e test -p 3000
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    depends_on:
      - db

  nuxt:
    image: cimg/node:18.18
    working_dir: /app/frontend
    command: npm ci && npx nuxi dev -p 3001
    ports:
      - "3001:3001"
    volumes:
      - .:/app
    depends_on:
      - rails

  vitest:
    image: cimg/node:18.18
    working_dir: /app/frontend
    command: bash -c "npm ci && npx nuxi prepare && npx vitest spec/components"
    volumes:
          - .:/app
```

## Playwright On CircleCI
1. From the root directory of our app, let's change our `.circleci/config.yml` to include a Playwright section:
    ```
    # .circleci/config.yml

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

      playwright:
        docker:
          - image: cimg/ruby:3.3-node
            environment:
              RAILS_ENV: test
        steps:
          - checkout
          - run:
              name: Install System Dependencies for Playwright
              command: |
                sudo apt-get update && sudo apt-get install -y \
                libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
                libxcomposite1 libxdamage1 libgbm1 libpango-1.0-0 libxrandr2 \
                libcups2 libdrm2 libxshmfence1 libasound2
          - run:
              name: Install Frontend Dependencies
              command: cd frontend && npm ci
          - run:
              name: Install Playwright Browsers
              command: cd frontend && npx playwright install
          - run:
              name: Install Bundler
              command: gem install bundler
          - run:
              name: Install Rails Gems
              command: cd backend && bundle install
          - run:
              name: Start Rails Backend
              command: cd backend && rails server -e test -p 3000
              background: true
          - run:
              name: Start Nuxt Frontend
              command: cd frontend && npx nuxi dev -p 3001
              background: true
          - run:
              name: Wait for Services to Start
              command: sleep 10
          - run:
              name: Run Playwright Tests
              command: cd frontend && npx playwright test spec/e2e

    workflows:
      version: 2
      test_workflow:
        jobs:
          - vitest
          - playwright
    ```
2. Let's commit these changes, push them up and run Playwright on CircleCI:
    - `git add .`
    - `git commit -m "Add Playwright"`
    - `git push`
    - That should start the tests running and now Vitest and Playwright should pass and show green.

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
5. `cd ..`

# RSpec On Local Docker
1. In the root directory of our app, let's add `db` and `rspec` services to `docker-compose.yml`:
    ```
    # docker-compose.yml

    services:

      vitest:
        image: cimg/node:18.18
        working_dir: /app/frontend
        command: bash -c "npm ci && npx nuxi prepare && npx vitest spec/components"
        volumes:
          - .:/app

      db:
        image: postgres:13
        environment:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - "5432:5432"
        healthcheck:
          test: ["CMD", "pg_isready", "-U", "postgres"]
          interval: 5s
          timeout: 10s
          retries: 5

      rspec:
        image: cimg/ruby:3.3-node
        working_dir: /app/backend
        environment:
          RAILS_ENV: test
          DB_HOST: db
          DB_USERNAME: postgres
          DB_PASSWORD: postgres
          DB_PORT: 5432
        command: bash -c "./wait-for-it.sh db:5432 -- bundle install && bin/rails db:create db:migrate && rspec"
        volumes:
          - .:/app
          - ./wait-for-it.sh:/app/backend/wait-for-it.sh
        depends_on:
          db:
            condition: service_healthy
    ```
2. Let's download a `wait-for-it.sh` script to our app's root directory and set the file permissions. This lets us wait for the database to be ready before running RSpec:
    - `curl -o wait-for-it.sh https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh`
    - `chmod +x wait-for-it.sh`
3. In `backend/config/database.yml`, change the `test:` section to:
    ```
    test:
      <<: *default
      database: backend_test
      username: <%= ENV.fetch("DB_USERNAME", "postgres") %>
      password: <%= ENV.fetch("DB_PASSWORD", "postgres") %>
      host: <%= ENV.fetch("DB_HOST", "localhost") %>
      port: <%= ENV.fetch("DB_PORT", "5432") %>
    ```
4. Run RSpec locally on Docker:
    - `docker-compose down --volumes --remove-orphans`
    - `docker-compose run --rm rspec` (you should see in green `1 example, 0 failures`)
      
5. Make sure RSpec still works locally:
    - `cd backend`
    - `rspec` (you should see in green `1 example, 0 failures` here, too)
    - `cd ..`

## RSpec On CircleCI
1. Let's now add RSpec to our `.circleci/config.yml`:
    ```
    # .circleci/config.yml

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

      playwright:
        docker:
          - image: cimg/ruby:3.3-node
            environment:
              RAILS_ENV: test
        steps:
          - checkout
          - run:
              name: Install System Dependencies for Playwright
              command: |
                sudo apt-get update && sudo apt-get install -y \
                libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
                libxcomposite1 libxdamage1 libgbm1 libpango-1.0-0 libxrandr2 \
                libcups2 libdrm2 libxshmfence1 libasound2
          - run:
              name: Install Frontend Dependencies
              command: cd frontend && npm ci
          - run:
              name: Install Playwright Browsers
              command: cd frontend && npx playwright install
          - run:
              name: Install Bundler
              command: gem install bundler
          - run:
              name: Install Rails Gems
              command: cd backend && bundle install
          - run:
              name: Start Rails Backend
              command: cd backend && rails server -e test -p 3000
              background: true
          - run:
              name: Start Nuxt Frontend
              command: cd frontend && npx nuxi dev -p 3001
              background: true
          - run:
              name: Wait for Services to Start
              command: sleep 10
          - run:
              name: Run Playwright Tests
              command: cd frontend && npx playwright test spec/e2e

      rspec:
        docker:
          - image: cimg/ruby:3.3-node
            environment:
              RAILS_ENV: test
          - image: postgres:13
            environment:
              POSTGRES_USER: postgres
              POSTGRES_PASSWORD: postgres
              POSTGRES_DB: backend_test
        steps:
          - checkout
          - run:
              name: Wait for Database
              command: |
                for i in {1..30}; do
                  pg_isready -h db -p 5432 -U postgres && break || sleep 2;
                done
          - run:
              name: Install Dependencies
              command: |
                cd backend && gem install bundler && bundle install
          - run:
              name: Run Database Setup
              command: |
                cd backend && bin/rails db:create db:migrate
          - run:
              name: Run RSpec
              command: cd backend && rspec

    workflows:
      version: 2
      test_workflow:
        jobs:
          - rspec
          - vitest
          - playwright
    ```
2. Just commit your changes and push:
    - `git add .`
    - `git commit -m "Add RSpec"`
    - `git push` (rspec, vitest and playwright should all be green and passing on CircleCI)

## Redeploy To Fly.io
It's time to redeploy our app and make sure all the changes we've been making haven't broken prod. It's ok to do these two steps at the same time if you want.
1. Let's redeploy our backend:
    - `cd backend`
    - `fly deploy`
2. Let's redeploy our frontend
    - `cd ../frontend`
    - `fly deploy`
3. Go to your frontend app url in a browser.
    - You should see "Hello from Nuxt!" and "Hello from Rails!"

## Rubocop
- `cd ~/app/backend`
- install VSCode extentions `Ruby LSP` and `Rubocop`
- `bundle add rubocop-rails`
- `bundle install`
- `touch .rubocop.yml`
- to `.rubocop.yml` add:
```
require: rubocop-rails
Style/Documentation:
  Enabled: false
```
- `rubocop -A`

## RSpec Matchers
- `bundle add shoulda-matchers --group "development, test"`
- `bundle install`
- make `~/app/backend/spec/rails_helper.rb` look like this:
```
# frozen_string_literal: true

require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
abort("The Rails environment is running in production mode!") if Rails.env.production?
require 'rspec/rails'
require 'shoulda/matchers'

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods

  config.use_transactional_fixtures = false

  config.before(:each) do
    Rails.application.routes.default_url_options[:host] = 'http://localhost:3000'
  end

  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!
end

Shoulda::Matchers.configure do |config|
  config.integrate do |with|
    with.test_framework :rspec
    with.library :rails
  end
end
```

### Factory Bot
- `cd ~/app/backend`
- `bundle add factory_bot_rails --group "development, test"`
- `bundle install`
- `mkdir spec/factories`
- we will wait to create the user factory until Devise creates it for us automatically when we use Devise to generate the user model

### Health Status Controller Test
- `cd ~/app/backend`
- `mkdir -p spec/requests/api/v1`
- `touch spec/requests/api/v1/health_controller_spec.rb`
- make `~/app/backend/spec/requests/api/v1/health_controller_spec.rb` look like this:
```
require 'rails_helper'

RSpec.describe "Api::V1::HealthControllers", type: :request do
  describe "GET /api/v1/up" do
    it "returns http success" do
      get "/api/v1/up"
      expect(response).to have_http_status(:success)
    end
  end
end
```
- `rspec spec/requests/api/v1/health_controller_spec.rb` -> should fail

### Health Status Controller
- Rails comes with a built-in health controller api at `/up`. We're going to move it to `/api/v1/up` because all our API urls will be prefixed with `/api/v1`, which is pretty common for APIs.
- `cd ~/app/backend`
- `mkdir -p app/controllers/api/v1`
- `touch app/controllers/api/v1/health_controller.rb`
- make `~/app/controllers/api/v1/health_controller.rb` look like this:
```
class Api::V1::HealthController < ApplicationController
  def show
    render json: { status: 'OK' }, status: :ok
  end
end
```
- make `~/app/backend/config/routes.rb` look like this:
```
# frozen_string_literal: true

Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      get 'hello', to: 'hello#index'
      get 'up' => 'health#show'
    end
  end
end
```
- `rspec spec/requests/api/v1/health_controller_spec.rb` -> should pass
- `cd ..`

### ESLint AutoSave
- We'll use [ESLint](https://eslint.org) to keep our JavaScript clean looking. Specifically, we'll use [antfu's eslint-config](https://github.com/antfu/eslint-config) which are nice presets including auto-fix on save and a nice one line CLI install tool.
- install VSCode extension `ESLint`
- `cd ~/app`
- `npm init` (hit enter for all prompts)
- `pnpm dlx @antfu/eslint-config@latest`
  - uncommitted changes, continue? `yes`
  - framework: `Vue`
  - extra utils: `none`
  - update `.vscode/settings.json`: `yes`
- `npm install`
- open `~/app/package.json`
  - you should see some red underlines for ESLint violations
  - hit `command + s` to save and you should see ESLint automatically fix the issues

  ### ESLint Commands
- `cd ~/app/frontend`
- `pnpm dlx @antfu/eslint-config@latest`
  - uncommitted changes, continue? `yes`
  - framework: `Vue`
  - extra utils: `none`
  - update `.vscode/settings.json`: `no`
- `npm install`
- in `~/app/frontend/package.json` in the `scripts` section add:
```
"lint": "npx eslint .",
"lint:fix": "npx eslint . --fix"
```
- `npm run lint` -> it will flag many issues
- `npm run lint:fix`
- `npm run lint` -> you can see it fixed most of the issues
- `cd ..`

# Part II: Pages, Flutter, Auth and UIThing 

## Add Pages
- `cd frontend`
- `mkdir pages`
- `touch pages/index.vue pages/public.vue pages/private.vue`
- make `~/app/frontend/pages/index.vue` look like this:
```
<!-- frontend/pages/index.vue -->

<template>
  <div>
    <h1>Home</h1>
    <p>Home copy</p>
  </div>
</template>
```
- make `~/app/frontend/pages/public.vue` look like this:
```
<!-- frontend/pages/public.vue -->

<template>
  <div>
    <h1>Public</h1>
    <p>Public copy</p>
  </div>
</template>
```
- make `~/app/frontend/pages/private.vue` look like this:
```
<!-- frontend/pages/private.vue -->

<template>
  <div>
    <h1>Private</h1>
    <p>Private copy</p>
  </div>
</template>
```
- `touch components/Header.vue`
```
<!-- frontend/components/Header.vue -->

<template>
  <nav>
    <ul>
      <li>
        <NuxtLink to="/">
          Home
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/public">
          Public
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/private">
          Private
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
```
- make `~/frontend/app.vue` look like this:
```
<!-- frontend/app.vue -->

<template>
  <Header />
  <NuxtPage />
  <Hello />
</template>
```
- `cd ..`

## Add Flutter With WebViews
- `cd` into the root folder of our app (`app/`)if you're not there already
- `flutter create flutter_app`
- `cd flutter_app`
- `flutter pub add webview_flutter`
- Let's modify `flutter_app/lib/main.dart` to load our web app (*And make sure to swap in our `<frontend web url>` towards the bottom*):
```
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: WebViewScreen(),
    );
  }
}

class WebViewScreen extends StatefulWidget {
  const WebViewScreen({super.key});

  @override
  State<WebViewScreen> createState() => _WebViewScreenState();
}

class _WebViewScreenState extends State<WebViewScreen> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse("https://app001-frontend.fly.dev"));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea( 
        child: WebViewWidget(controller: _controller),
      ),
    );
  }
}
```
- Let's setup an android emulator:
  - Open android studio
  - Tools -> Device Manager
  - Click the "plus" icon to create a new device -> Create Virtual Device
  - Pick the latest phone that doesn't have the play store icon in the Play column. Right now, that's Pixel 6 Pro -> Next
  - Click the Additional Settings tab
  - Scroll down to the bottom where it says Emulated Performance
  - For graphics acceleration, select Hardware
  - For RAM enter `4` for GB
  - Click Finish
  - Start the emulator you just created in the Device Manager area by clicking the play icon to the right of your new emulator's name
- Let's setup an iPhone simulator:
  - Open XCode
  - XCode -> Open Developer Tool -> Simulator
  - That should open the iPhone simulator
- `flutter devices` <- you should see both the android emulator and the iphone simulator listed there (and probably other stuff too).
  - note the ids of the android emulator and the iphone simulator. The id is the first thing to the right of the device name. For me the android emulator id is `emulator-5554` and the iphone simulator id is `36C6816E-25E8-4669-9505-2A9A2BC9CD47`
- open two terminal tabs
  - in the first tab run `flutter run -d <iphone simulator id>`
  - in the second tab run `flutter run -d <android emulator id>`

## Tailwind
- We'll use [Nuxt Tailwind](https://tailwindcss.nuxtjs.org) for modern, scaleable css. We'll setup tailwind now because UI Thing we set up in the next step needs it.
- install the VSCode extension `vscode-tailwind-magic`
- `cd ~/app/frontend`
- `npx nuxi@latest module add tailwindcss`
- For the record, installing the tailwind module added itself to our module list in  `~/app/frontend/nuxt.config.ts`, which now looks something like this now:
```
export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: { public: { apiBase: 'http://localhost:3000/api/v1' }},
  devServer: { port: 3001 },
  modules: ['@nuxt/test-utils/module', '@nuxtjs/tailwindcss'],
})
```
- add this to the top of `frontend/tailwind.config.js`, right inside `module.exports = {`
```
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './app.vue',
  ],
```
- make `~/frontend/app.vue` look like this:
```
<!-- frontend/app.vue -->
<script setup>
const colorMode = useColorMode()
colorMode.preference = 'light' // Forces light mode
</script>

<template>
  <div class="max-w-[1100px] mx-auto">
    <Header />
    <NuxtPage />
    <Hello />
  </div>
</template>
```
`npm run dev` -> "Hello World" in sans serif font Inter
^ + c

## UI Thing
- We'll use [UI Thing](https://ui-thing.behonbaker.com), for our UI kit. A UI kit is a collection of re-usable [shadcn-ui](https://ui.shadcn.com/) components and component blocks. Specifically, UI Thing is a port of [shadc-vue](https://www.shadcn-vue.com/) for Nuxt. We'll setup UI Thing now because our non-placeholder homepage we build in the next section uses it.
- `cd ~/app/frontend`
- `npx ui-thing@latest init`
  - pick a theme color when prompted
  - you can hit enter for all the other questions including for npm
- `npm i -D @iconify-json/lucide`
- For the record, the UI Thing install added a handful of packages and modules and added some extra configurations to our `~/app/frontend/nuxt.config.ts`, which now looks something like this:
```
export default defineNuxtConfig({
  devtools: { enabled: true },
  runtimeConfig: { public: { apiBase: "http://localhost:3000/api/v1" } },
  devServer: { port: 3001 },

  modules: [
    "@nuxt/test-utils/module",
    "@nuxtjs/tailwindcss",
    "@nuxtjs/color-mode",
    "@vueuse/nuxt",
    "@nuxt/icon",
  ],

  tailwindcss: {
    exposeConfig: true,
  },

  colorMode: {
    classSuffix: "",
  },

  imports: {
    imports: [
      {
        from: "tailwind-variants",
        name: "tv",
      },
      {
        from: "tailwind-variants",
        name: "VariantProps",
        type: true,
      },
    ],
  },
});
```
- `npm install @tailwindcss/typography`
- add this to the bottom of `frontend/assets/css/tailwindcss`
```
@layer base {
  h1 {
    @apply text-5xl font-bold;
  }
  h2 {
    @apply text-4xl font-bold;
  }
  h3 {
    @apply text-3xl font-semibold;
  }
}
```
- `npx ui-thing@latest add container navigation-menu navigation-menu-link scroll-area sheet`
- change `components/Header.vue` to this:
```
<!-- frontend/components/Header.vue -->

<script lang="ts" setup></script>

<template>
  <header class="z-20 border-b bg-background/90 backdrop-blur">
    <UiContainer class="flex h-16 items-center justify-between lg:h-20">
      <div class="flex items-center gap-10">
        <NuxtLink to="/" class="flex items-center gap-3">
          <!-- eslint-disable-next-line vue/html-self-closing -->
          <img
            src="/icon.png"
            fit="contain"
            alt="Company Logo"
            title="Company Logo"
            class="h-6 object-contain lg:h-8"
          />
          <span class="font-semibold lg:text-lg">Ruxtmin</span>
        </NuxtLink>
        <UiNavigationMenu as="nav" class="hidden items-center justify-start gap-8 lg:flex">
          <UiNavigationMenuList class="gap-2">
            <UiNavigationMenuItem>
              <UiNavigationMenuLink as-child>
                <UiButton to="/" variant="ghost" size="sm">
                  Home
                </UiButton>
              </UiNavigationMenuLink>
            </UiNavigationMenuItem>
            <UiNavigationMenuItem>
              <UiNavigationMenuLink as-child>
                <UiButton to="/public" variant="ghost" size="sm">
                  Public
                </UiButton>
              </UiNavigationMenuLink>
            </UiNavigationMenuItem>
            <UiNavigationMenuItem>
              <UiNavigationMenuLink as-child>
                <UiButton to="/private" variant="ghost" size="sm">
                  Private
                </UiButton>
              </UiNavigationMenuLink>
            </UiNavigationMenuItem>
          </UiNavigationMenuList>
        </UiNavigationMenu>
      </div>
      <div class="lg:hidden">
        <UiSheet>
          <UiSheetTrigger as-child>
            <UiButton variant="ghost" size="icon-sm">
              <Icon name="lucide:menu" class="h-5 w-5" />
            </UiButton>
            <UiSheetContent class="w-[90%] p-0">
              <template #content>
                <UiSheetTitle class="sr-only" title="Mobile menu" />
                <UiSheetDescription class="sr-only" description="Mobile menu" />
                <UiSheetX class="z-20" />

                <UiScrollArea class="h-full p-5">
                  <div class="flex flex-col gap-2">
                    <UiButton variant="ghost" class="justify-start text-base" to="/">
                      Home
                    </UiButton>
                    <UiButton variant="ghost" class="justify-start text-base" to="/public">
                      Public
                    </UiButton>
                    <UiButton variant="ghost" class="justify-start text-base" to="/private">
                      Private
                    </UiButton>
                    <UiGradientDivider class="my-5" />
                    <UiButton to="signup">
                      Sign up
                    </UiButton>
                    <UiButton variant="outline" to="login">
                      Log in
                    </UiButton>
                  </div>
                </UiScrollArea>
              </template>
            </UiSheetContent>
          </UiSheetTrigger>
        </UiSheet>
      </div>
      <div class="hidden items-center gap-3 lg:flex">
        <UiButton to="login" variant="ghost" size="sm">
          Log in
        </UiButton>
        <UiButton to="signup" size="sm">
          Sign up
        </UiButton>
      </div>
    </UiContainer>
  </header>
</template>
```
- Let's create a page component
  - `touch components/Page.vue`
```
<!-- frontend/components/Page.vue -->

<script lang="ts" setup>
withDefaults(
  defineProps<{
    title?: string
    text?: string
  }>(),
  {
    title: 'Placeholder Title',
    text: 'Placeholder body copy',
  },
)
</script>

<template>
  <UiContainer class="py-16 lg:py-24">
    <slot name="title">
      <h2 class="mb-4 mt-2 text-4xl font-bold lg:mb-6 lg:mt-3 lg:text-5xl">
        {{ title }}
      </h2>
    </slot>
    <div class="mt-5 flex w-full flex-col gap-3 lg:w-auto max-w-[800px]">
      <slot>
        {{ text }}
      </slot>
    </div>
  </UiContainer>
</template>
```
- Let's redo our homepage at `pages/index.vue` with our new page component:
```
<!-- frontend/pages/index.vue -->

<script lang="ts" setup></script>

<template>
  <Page title="Home">
    <p class="text-lg lg:text-xl">
      Hello, everyone. Well it’s official. Old Dwight is lame and New Dwight is cool.
    </p>
  </Page>
</template>
```
- Let's redo our public page at `pages/public.vue` with our new page component:
```
<!-- frontend/pages/public.vue -->

<script lang="ts" setup></script>

<template>
  <Page title="Public">
    <p class="text-lg lg:text-xl">
      It's overlapping. It's all spilling over the edge. One word, two syllables. Demarcation.
    </p>
  </Page>
</template>
```
- Let's redo our private page at `pages/private.vue` with our new page component:
```
<!-- frontend/pages/private.vue -->

<script lang="ts" setup></script>

<template>
  <Page title="Private">
    <p class="text-lg lg:text-xl">
      People I respect, heroes of mine, would be Bob Hope... Abraham Lincoln, definitely. Bono. And probably God would be the fourth one. And I just think all those people really helped the world in so many ways that it's really beyond words. It's really incalculable.
    </p>
  </Page>
</template>
```
- Let's rename our `Hello.vue` component at `components/Hello.vue` to `Footer.vue` and change `Footer.vue` to this:
```
<!-- frontend/components/Footer.vue -->

<script lang="ts" setup>
import { onMounted, ref } from 'vue'

const runtimeConfig = useRuntimeConfig()
const message = ref('Backend: Unavailable') // Default state

onMounted(async () => {
  try {
    const response = await fetch(`${runtimeConfig.public.apiURL}/hello`)
    if (!response.ok)
      throw new Error('Failed to fetch')

    const data = await response.json()

    // If the backend responds with a valid message, set "Running"
    message.value = data.message ? 'Running' : 'No response'
  }
  catch (error) {
    message.value = 'Backend: Unavailable'
  }
})
</script>

<template>
  <UiContainer
    as="footer"
    class="flex flex-col items-center justify-center gap-7 py-12 lg:flex-row lg:justify-end"
  >
    <p class="text-muted-foreground">
      Frontend: <code>Running</code>
    </p>
    <p class="text-muted-foreground">
      Backend: <code>{{ message }}</code>
    </p>
    <p class="text-muted-foreground">
      &copy; {{ new Date().getFullYear() }} Ruxtmin
    </p>
  </UiContainer>
</template>

<style scoped>
  code {
    font-weight: 600
  }
</style>
```
- Let's create our login page:
- `touch pages/login.vue`
```
<!-- frontend/pages/login.vue -->

<script setup>
const { signIn } = useAuth()
definePageMeta({ auth: false })
const email = ref('test@mail.com')
const password = ref('password')

async function login() {
  await signIn({ user: { email: email.value, password: password.value } }, { redirect: false })
  useSonner('Logged in successfully!', { description: 'You have successfully logged in.' })
  navigateTo('/')
}
</script>

<template>
  <Page title="Login">
    <div class="flex h-screen">
      <div class="w-full max-w-[330px] px-5 overflow-visible">
        <p class="mt-8 text-sm">
          Enter your email & password to log in.
        </p>
        <form class="mt-10">
          <fieldset class="grid space-y-5">
            <div>
              <UiVeeInput label="Email" type="email" name="email" placeholder="john@example.com" />
            </div>
            <div>
              <UiVeeInput label="Password" type="password" name="password" />
            </div>
            <div>
              <UiButton class="w-full" type="submit" text="Log in" @click.prevent="login" />
            </div>
          </fieldset>
        </form>
        <p class="mt-4 text-sm text-muted-foreground">
          Don't have an account?
          <NuxtLink class="font-semibold text-primary underline-offset-2 hover:underline" to="/signup">
            Create account
          </NuxtLink>
        </p>
      </div>
    </div>
  </Page>
</template>
```
- Let's create the signup page.
- `touch pages/signup.vue`
```
<!-- frontend/pages/signup.vue -->

<script setup>
const { signUp } = useAuth()

definePageMeta({ auth: false })

const email = ref('')
const password = ref('')

async function register() {
  await signUp({ user: { email: email.value, password: password.value } }, { redirect: false })
  useSonner('Signed up successfully!', { description: 'You have successfully signed up.' })
  navigateTo('/confirm')
}
</script>

<template>
  <Page title="Signup">
    <div class="flex h-screen">
      <div class="w-full max-w-[330px] px-5 overflow-visible">
        <p class="mt-8 text-sm">
          Enter your email & password to log in.
        </p>
        <form class="mt-10" @submit="submit">
          <fieldset :disabled="isSubmitting" class="grid space-y-5">
            <div>
              <UiVeeInput v-model="email" label="Email" type="email" name="email" placeholder="test@mail.com" />
            </div>
            <div>
              <UiVeeInput v-model="password" label="Password" type="password" name="password" placeholder="password" />
            </div>
            <div>
              <UiButton class="w-full" type="submit" text="Sign up" @click.prevent="register" />
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  </Page>
</template>
```
### Install Sidebase Nuxt-Auth
- Next we'll setup our signup/login functionality with `@sidebase/nuxt-auth`
- `cd ~/app/frontend`
- `npx nuxi@latest module add @sidebase/nuxt-auth`
- `npm install`

### Setup Sidebase Nuxt-Auth
- Sidebase Nuxt Auth keeps its settings under `auth` in `nuxt.config.ts`. Here we'll lock down all pages by default with `globalAppMiddleware: { isEnabled: true }` and we also specify all our auth endpoints.
- `cd ~/app/frontend`
- add this line to the top of `~/app/frontend/nuxt.congif.js` (above the `export default defineNuxtConfig<{`}):
```
const development = process.env.NODE_ENV !== 'production'
```
- add this `auth` section to `~/app/frontend/nuxt.config.js`--making sure to replace both `<backend url>` instances with your backend url:
```
  auth: {
    computed: { pathname: development ? 'http://localhost:3000/api/v1/auth/' : '<backend url>/api/v1/auth/' },
    isEnabled: true,
    baseURL: development ? 'http://localhost:3000/api/v1/auth/' : '<backend url>/api/v1/auth/',
    globalAppMiddleware: { isEnabled: true },
    provider: {
      type: 'local',
      pages: { login: '/' },
      token: { signInResponseTokenPointer: '/token' },
      endpoints: {
        signIn: { path: 'login', method: 'post' },
        signOut: { path: 'logout', method: 'delete' },
        signUp: { path: 'signup', method: 'post' },
        getSession: { path: 'current_user', method: 'get' },
      },
    },
  }
```

### Unlock The Public Page
- Because we have `globalAppMiddleware: { isEnabled: true }` in `nuxt.config.ts`, if a user is logged out, all pages redirect to the homepage. To override this behaivor on specific pages and make them public, we add `definePageMeta({ auth: false })` in the page's `script` section.
- `cd ~/app/frontend`
- to the top of `~/app/frontend/pages/public.vue` add:
```
<script>
definePageMeta({ auth: false })
</script>
```

### Hide The Private Page Link
- Right now if you are logged out and click the link to the private page, you're redirected to the homepage, which is what we want. But we also don't even want the link to the private page to show at all for users who are logged out. Sidebase Nuxt Auth gives us a `useAuth()` method which has a `status` property. With `status`, we can add conditional vue logic in templates like `v-if="status === 'authenticated'"` which will only render it's tag if the user is logged in.
- `cd ~/app/frontend`
- add this script section to `~/app/frontend/components/Header.vue`:
```
<script setup>
const { data, signOut, status } = useAuth()

const uuid = computed(() => {
  if (data && data.value) {
    return data.value.uuid
  }
  return ''
})

async function logout() {
  await signOut({ callbackUrl: '/' })
  useSonner('Logged out successfully!', { description: 'You have successfully logged out.' })
}
</script>
```
- add this to the private `UiNavigationMenuItem`s:
```
v-if="status === 'authenticated'"
```
- We also want to only show the login/signup buttons if the used is logged out and if the user is logged in, show the logout button. Change the login/signup button area to this:
```
      <div v-if="status !== 'authenticated'" class="hidden items-center gap-3 lg:flex">
        <UiButton to="login" variant="ghost" size="sm">
          Log in
        </UiButton>
        <UiButton to="signup" size="sm">
          Sign up
        </UiButton>
      </div>
      <div v-if="status === 'authenticated'" class="hidden items-center gap-3 lg:flex">
        <UiButton to="logout" variant="ghost" size="sm" @click.prevent="logout">
          Log out
        </UiButton>
      </div>
```

## Devise
- `cd ~/app/backend`
- `rails db:create` (or `rails db:drop db:create` if you already have a database called `backend`)
- `bundle add devise devise-jwt jsonapi-serializer`
- `bundle install`
- `rails generate devise:install`
- in `~/app/backend/config/environments/development.rb`, near the other `action_mailer` lines add:
```
config.action_mailer.default_url_options = { host: 'localhost', port: 3000 }
```
- in `~/app/backend/config/initializers/devise.rb` uncomment the `config.navigational_format` line and make that line look like this:
```
config.navigational_formats = []
```
- to avoid a `Your application has sessions disabled. To write to the session you must first configure a session store` error, in `~/app/backend/config/application.rb` add this near the other `config.` lines:
```
    config.session_store :cookie_store, key: '_interslice_session'
    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options
```

### User Model
- `cd ~/app/backend`
- `rails g migration EnableUuid`
- add `enable_extension 'pgcrypto'` to `~/app/backend/db/migrate/<timestamp>_enable_uuuid.rb` inside the `change` method
- `rails db:migrate`
- `rails generate devise User`
- make `~/app/backend/db/<timestamp>_devise_create_users.rb` look like this:
```
# frozen_string_literal: true

class DeviseCreateUsers < ActiveRecord::Migration[7.1]
  def change
    create_table :users do |t|
      ## Database authenticatable
      t.string :email,              null: false, default: ""
      t.string :encrypted_password, null: false, default: ""

      ## Custom additions I did
      t.boolean :admin, default: false
      t.uuid :uuid, index: { unique: true }

      ## Recoverable
      t.string   :reset_password_token
      t.datetime :reset_password_sent_at

      ## Rememberable
      t.datetime :remember_created_at

      ## Trackable
      t.integer  :sign_in_count, default: 0, null: false
      t.datetime :current_sign_in_at
      t.datetime :last_sign_in_at
      t.string   :current_sign_in_ip
      t.string   :last_sign_in_ip

      ## Confirmable
      t.string   :confirmation_token
      t.datetime :confirmed_at
      t.datetime :confirmation_sent_at
      t.string   :unconfirmed_email # Only if using reconfirmable

      ## Lockable
      t.integer  :failed_attempts, default: 0, null: false # Only if lock strategy is :failed_attempts
      t.string   :unlock_token # Only if unlock strategy is :email or :both
      t.datetime :locked_at

      t.timestamps null: false
    end

    add_index :users, :email,                unique: true
    add_index :users, :reset_password_token, unique: true
    add_index :users, :confirmation_token,   unique: true
    add_index :users, :unlock_token,         unique: true
  end
end
```
- `rails db:migrate`
- make `~/app/backend/spec/factories/users.rb` look like this:
```
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "test#{n}@mail.com" }
    password { 'password' }

    trait :confirmed do
      confirmed_at { Time.zone.now }
    end
  end
end
```

### User Model Spec
- I think at this point `~/app/backend/spec/models/user_spec.rb` is created, but mostly empty.
- make `~/app/backend/spec/models/user_spec.rb` look like this:
```
# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
# email                   :string     default(""), not null, index
# encrypted_password      :string     default(""), not null
# admin                   :boolean    not null
# uuid                    :uuid       unique, index
# reset_password_token    :string     unique, index
# reset_password_sent_at  :datetime
# remember_created_at     :datetime
# sign_in_count           :integer    default(0), not null
# current_sign_in_at      :datetime
# last_sign_in_at         :datetime
# current_sign_in_ip      :string
# last_sign_in_ip         :string
# confirmation_token      :string     index
# confirmed_at            :datetime
# confirmation_sent_at    :datetime
# unconfirmed_email       :string
# failed_attempts         :integer    default(0),not null
# unlock_token            :string     unique, index
# locked_at               :datetime
# created_at              :datetime   not null
# updated_at              :datetime   not null
# jti                     :string     not null, unique, index

require 'rails_helper'

# Devise handles most validations internally, so I believe this is all we can test here
RSpec.describe User, type: :model do
  it { should validate_presence_of(:email) }
  it { should validate_presence_of(:password) }
end
```

### User Registration
- `rails g devise:controllers api/v1/auth -c sessions registrations`
- make `~/app/backend/config/routes.rb` look like this:
```
# frozen_string_literal: true

Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users, param: :uuid
      get 'up' => 'health#show'
    end
  end
  devise_for :users, path: '', path_names: {
    sign_in: 'api/v1/auth/login',
    sign_out: 'api/v1/auth/logout',
    registration: 'api/v1/auth/signup'
  }, controllers: {
    sessions: 'api/v1/auth/sessions',
    registrations: 'api/v1/auth/registrations'
  }
end
```

### Users Controller
- `cd ~/app/backend`
- `touch app/controllers/api/v1/users_controller.rb`
- make `~/app/backend/app/controllers/api/v1/users_controller.rb` look like this:
```
class Api::V1::UsersController < ApplicationController
  before_action :set_user, only: %i[ show edit update destroy ]

  # GET /users or /users.json
  def index
    @users = User.all
    render json: @users
  end

  # GET /users/1 or /users/1.json
  def show
    render json: @user
  end

  # GET /users/new
  def new
    @user = User.new
  end

  # GET /users/1/edit
  def edit
  end

  # POST /users or /users.json
  def create
    @user = User.new(user_params)

    if @user.save
      render json: @user, status: :created, location: @user
    else
      render json: @user.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /users/1 or /users/1.json
  def update
    if @user.update(user_params)
      render json: @user, status: :ok, location: @user
    else
      render json: @user.errors, status: :unprocessable_entity
    end
  end

  # DELETE /users/1 or /users/1.json
  def destroy
    @user.destroy!
    head :no_content
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_user
      @user = User.find_by!(uuid: params[:uuid])
    end

    # Only allow a list of trusted parameters through.
    def user_params
      params.require(:user).permit(:uuid, :email, :password)
    end
end
```

### JWT
- `cd ~/app/backend`
- add this to `~/app/backend/config/initializers/devise.rb` right before the last `end`:
```
  config.jwt do |jwt|
    # jwt.secret = Rails.application.credentials.fetch(:secret_key_base)
    jwt.secret = ENV['SECRET_KEY_BASE'] || 'dummy_secret_key_for_tests'
    jwt.dispatch_requests = [
      ['POST', %r{^/api/v1/auth/login$}]
    ]
    jwt.revocation_requests = [
      ['DELETE', %r{^/api/v1/auth//logout$}]
    ]
    jwt.expiration_time = 30.minutes.to_i
  end
```
- `rails g migration addJtiToUsers jti:string:index:unique`
- change `~/app/backend/db/migrate/<timestamp>_add_jti_to_users.rb` to include this:
```
  add_column :users, :jti, :string, null: false
  add_index :users, :jti, unique: true
```
- make `~/app/backend/app/models/user.rb` look like this:
```
class User < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :confirmable, :lockable, :timeoutable, :trackable,
         :jwt_authenticatable, jwt_revocation_strategy: self
  before_create :set_uuid

  private

  def set_uuid
    self.uuid = SecureRandom.uuid if uuid.blank?
  end
end
```
- `rails db:migrate`
- `rails generate serializer user id email uuid`

### Auth Controllers
- `cd ~/app/backend`
- make `~/app/backend/app/controllers/api/v1/auth/registrations_controller.rb` look like this:
```
class Api::V1::Auth::RegistrationsController < Devise::RegistrationsController
  respond_to :json
  private

  def respond_with(resource, _opts = {})
    if request.method == "POST" && resource.persisted?
      render json: {
        status: {code: 200, message: "Signed up sucessfully."},
        data: UserSerializer.new(resource).serializable_hash[:data][:attributes]
      }, status: :ok
    elsif request.method == "DELETE"
      render json: {
        status: { code: 200, message: "Account deleted successfully."}
      }, status: :ok
    else
      render json: {
        status: {code: 422, message: "User couldn't be created successfully. #{resource.errors.full_messages.to_sentence}"}
      }, status: :unprocessable_entity
    end
  end
end
```
- make `~/app/backend/app/controllers/api/v1/auth/sessions_controller.rb` look like this:
```
class Api::V1::Auth::SessionsController < ApplicationController
  before_action :authenticate_user!, only: [:destroy]
  respond_to :json

  def create
    user_params = params.dig(:user) || params.dig(:session, :user)

    if user_params.present?
      user = User.find_by(email: user_params[:email])

      if user&.valid_password?(user_params[:password])
        token = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil).first
        render json: {
          token: token,
          status: { code: 200, message: 'Logged in successfully.' }
        }, status: :ok
      else
        render json: {
          status: 401,
          message: 'Invalid email or password.'
        }, status: :unauthorized
      end
    else
      render json: {
        status: 400,
        message: 'Invalid parameters.'
      }, status: :bad_request
    end
  end

  def destroy
    if current_user
      # Assuming you have a method to handle logout logic
      render json: {
        status: 200,
        message: 'Logged out successfully.'
      }, status: :ok
    else
      render json: {
        status: 401,
        message: "Couldn't find an active session."
      }, status: :unauthorized
    end
  end
end
```

### Current User Endpoint
- `cd ~/app/backend`
- `rails g controller Api::V1::Auth::current_user index`
- make `~/app/backend/app/controllers/api/v1/auth/current_user_controller.rb` look like this:
```
class Api::V1::Auth::CurrentUserController < ApplicationController
  before_action :authenticate_user!
  def index
    render json: UserSerializer.new(current_user).serializable_hash[:data][:attributes], status: :ok
  end
end
```
- make `~/app/backend/config/routes.rb` look like this:
```
# frozen_string_literal: true

Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      namespace :auth do
        get 'current_user', to: 'current_user#index'
        post 'login', to: 'sessions#create'
        delete 'logout', to: 'sessions#destroy'
      end
      resources :users, param: :uuid
      get 'up' => 'health#show'
    end
  end
  devise_for :users, path: '', path_names: {
    sign_in: 'api/v1/auth/login',
    sign_out: 'api/v1/auth/logout',
    registration: 'api/v1/auth/signup'
  }, controllers: {
    sessions: 'api/v1/auth/sessions',
    registrations: 'api/v1/auth/registrations'
  }
end
```

### User Seeds
- `cd ~/app/backend`
- make `~/app/backend/db/seeds.rb` look like this:
```
User.create!(email: 'test@mail.com', password: 'password', admin: true)
User.create!(email: 'test2@mail.com', password: 'password')
```

### Update Backend For Prod
- Our backend API was working on prod last time we checked, but that was just a simple API call that wasn't pulling anything from the database at all. We've now added database calls to our frontend and backend code and everything is working locally. But if we deploy either our frontend or backend code to fly.io now, we'll see quite a few errors. So let's fix all that now.
- `cd ~/app/backend`
- in `~/app/backend/config/puma.rb`, below the `port ENV.fetch('PORT', 3000)` on line 37, add this:
```
# Specifies the `bind` address that Puma will listen on.
bind "tcp://0.0.0.0:#{ENV.fetch('PORT', 3000)}"
```
- `touch config/initializers/default_url_options.rb`
- make `~/app/backend/config/initializers/default_url_options.rb` look like this:
```
# config/initializers/default_url_options.rb

Rails.application.routes.default_url_options = {
  host: ENV['DEFAULT_URL_HOST'] || 'localhost',
  port: ENV['DEFAULT_URL_PORT'] || 3000
}

# Optionally, you can set different options for different environments
Rails.application.configure do
  config.action_mailer.default_url_options = { host: ENV['DEFAULT_URL_HOST'] || 'localhost', port: ENV['DEFAULT_URL_PORT'] || 3000 }
end
```

### Add SECRET_KEY_BASE To CircleCI
- You may run into `SECRET_KEY_BASE` issues. In that case:
  - in `~/app/backend/config/initializers/devise.rb`:
    - right above `Devise.setup do |config|`, add `raise "SECRET_KEY_BASE is missing" if ENV['SECRET_KEY_BASE'].nil? && Rails.env.production?`
    - right below `Devise.setup do |config|`, add `config.secret_key = ENV['SECRET_KEY_BASE'] || 'dummy_secret_key_for_tests'`
  - add your `SECRET_KEY_BASE` to CircleCI:
    - `cd ~/app/backend`
    - `EDITOR="code --wait" rails credentials:edit`
      - copy the value of the `secret-key-base` and close the creds file
    - in the CircleCI UI, go to Project Settings -> Environment Variables
    - Add `SECRET_KEY_BASE` and paste your copied value in for the value
    - TODO: Maybe also add the POSTGRES_PASSWORD here?

### Test The API
- `cd ~/app/backend`
- `rails server`
- split your terminal and in the second pane, run `curl -H 'Content-Type: application/json' -X POST -d '{"user": { "email": "test@mail.com", "password" : "password" }}' http://localhost:3000/api/v1/auth/signup`
- You should see a `status: 200` in the response somewhere and now a user is created. We will test the login API next, but first we must set the user's email to confirmed in the database. In your first terminal (the rails server one):
  - `^ + c` -> to kill the server
  - `rails console`
  - `user = User.find_by(email: "test@mail.com")`
  - `user.confirmed_at = Time.now`
  - `user.save!`
  - `exit`  
  - `rails server` -> to restart the server
- in the second terminal now run `curl -H 'Content-Type: application/json' -X POST -d '{"user": { "email": "test@mail.com", "password" : "password" }}' http://localhost:3000/api/v1/auth/login`
- you should see a `status: 200` in the response somewhere a long `token` string and now our user is logged in
- kill the server with `^ + c`
- `rm spec/requests/api/v1/current_user_spec.rb` (TODO: I'm not 100% the correct path here)

### Test The UI Locally
- `cd ~/app/frontend`
- `npm run front-and-back-dev`
- in a browser, go to http://localhost:3001
  - home & public pages should work
  - logging in (with the default `test@mail.com` / `password`) should work and should show the Private page link and the user avatar for the user menu
  - logging out should work

### Redeploy to Fly.io
- in the frontend folder: `fly deploy`
- in the backend folder: `fly deploy`
- `fly ssh console`
  - `bin/rails db:seed`
  - `exit`
- Our one user has been seeded in prod, but is still not confirmed and login will error unless we confirm them:
  - `fly console`
  - `user = User.find_by(email: "test@mail.com")`
  - `user.confirmed_at = Time.now`
  - `user.save!`
  - `exit`  

