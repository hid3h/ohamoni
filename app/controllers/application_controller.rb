class ApplicationController < ActionController::API
  def health
    render :json => "ohamoni"
  end
end
