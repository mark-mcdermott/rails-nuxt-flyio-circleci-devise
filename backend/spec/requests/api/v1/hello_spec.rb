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