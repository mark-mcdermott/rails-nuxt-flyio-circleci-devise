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