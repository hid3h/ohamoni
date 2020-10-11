class AddColumnWokeUpOn < ActiveRecord::Migration[6.0]
  def change
    add_column :wake_up_times, :woke_up_on, :date, null: false, after: :user_id

    add_index :wake_up_times, [:user_id, :woke_up_on], unique: true

  end
end
