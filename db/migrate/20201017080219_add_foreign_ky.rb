class AddForeignKy < ActiveRecord::Migration[6.0]
  def change
    add_foreign_key :wake_up_times, :users
  end
end
