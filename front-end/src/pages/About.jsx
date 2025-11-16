import React from 'react';
import FoodBackground from '../Components/background';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
     <FoodBackground/>
     <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 mt-3">
            Northeastern Dining Halls
          </h1>
          <p className="text-xl text-gray-600">
            Discover delicious and nutritious meals across our campus dining locations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Stetson East</h2>
            <p className="text-gray-600 mb-4">
              Located in the heart of campus, Stetson East offers a variety of dining options
              including breakfast, lunch, and dinner with diverse cuisines.
            </p>
            <ul className="text-sm text-gray-500">
              <li>• Breakfast: 7:00 AM - 10:00 AM</li>
              <li>• Lunch: 11:00 AM - 3:00 PM</li>
              <li>• Dinner: 5:00 PM - 9:00 PM</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">International Village</h2>
            <p className="text-gray-600 mb-4">
              A global dining experience featuring international cuisines and cultural flavors
              from around the world.
            </p>
            <ul className="text-sm text-gray-500">
              <li>• Breakfast: 7:30 AM - 10:30 AM</li>
              <li>• Lunch: 11:30 AM - 3:30 PM</li>
              <li>• Dinner: 5:30 PM - 9:30 PM</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">60 Belvidere</h2>
            <p className="text-gray-600 mb-4">
              Modern dining with contemporary American cuisine, featuring fresh ingredients
              and healthy options.
            </p>
            <ul className="text-sm text-gray-500">
              <li>• Breakfast: 7:00 AM - 10:00 AM</li>
              <li>• Lunch: 11:00 AM - 2:00 PM</li>
              <li>• Dinner: 5:00 PM - 8:00 PM</li>
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Protein Labels Explained
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold text-green-600 mb-3">High Protein Options</h3>
              <p className="text-gray-600 mb-4">
                Items marked as "High Protein" contain significant amounts of protein per serving,
                typically 20g or more. These include meats, fish, eggs, dairy, legumes, and certain
                plant-based proteins.
              </p>
              <p className="text-sm text-gray-500">
                Look for items with meat, chicken, fish, tofu, beans, lentils, eggs, cheese, or
                Greek yogurt as primary ingredients.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-600 mb-3">Dietary Filters</h3>
              <p className="text-gray-600 mb-4">
                Our menu filtering system helps you find meals that match your dietary preferences:
              </p>
              <ul className="text-sm text-gray-500 space-y-2">
                <li><strong>Vegan:</strong> No animal products of any kind</li>
                <li><strong>Vegetarian:</strong> No meat, but may contain dairy and eggs</li>
                <li><strong>High Protein:</strong> 20g+ protein per serving</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}