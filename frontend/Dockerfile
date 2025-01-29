FROM cimg/ruby:3.3-node

# Install system dependencies
USER root
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
    libxcomposite1 libxdamage1 libgbm1 libpango-1.0-0 libxrandr2 \
    libcups2 libdrm2 libxshmfence1 libasound2

# Switch back to non-root user
USER circleci