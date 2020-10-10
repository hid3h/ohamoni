class CreateWakeUpTimes < ActiveRecord::Migration[6.0]
  def change
    create_table :wake_up_times do |t|
      t.references :user, null: false
      t.datetime :woke_up_at, null: false

      t.datetime :created_at, null: false, default: -> { 'NOW()' }
      t.datetime :updated_at, null: false, default: -> { 'NOW()' }
    end
  end
end
