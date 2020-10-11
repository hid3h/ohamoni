class User < ApplicationRecord
  has_many :wake_up_times

  class << self
    def find_or_create_by_line_user_id(line_user_id:)
      user = find_by(line_user_id: line_user_id)
      return user if user

      client = LineBotClient.new
      profile = client.get_profile(line_user_id)
      User.create(
        line_user_id: line_user_id,
        display_name: profile['displayName'],
        picture_url: profile['pictureUrl']
      )
    end
  end
end
