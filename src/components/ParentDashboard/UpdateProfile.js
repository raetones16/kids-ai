import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { StorageService } from '../../services/StorageService';

/**
 * Component for updating a child profile
 */
const UpdateProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ 
    name: '',
    dob: '',
    customInstructions: '',
    color: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const storageService = new StorageService();

  // Load profile data on component mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (id) {
          setLoading(true);
          const profileData = await storageService.getChildProfileById(id);
          
          if (profileData) {
            console.log('Loaded profile data:', profileData);
            setProfile(profileData);
          } else {
            setError('Profile not found');
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [id]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Debug the data being sent
      console.log('Updating profile with data:', profile);
      
      // Validate data
      if (!profile.name || !profile.dob) {
        setError('Name and date of birth are required');
        return;
      }

      // Save the profile
      const updatedProfile = await storageService.saveChildProfile(profile);
      console.log('Profile updated successfully:', updatedProfile);
      
      // Navigate back to profiles list
      navigate('/parent-dashboard');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  // For debugging
  useEffect(() => {
    console.log('Current profile state:', profile);
  }, [profile]);

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="pt-6">
        <h1 className="text-2xl font-bold mb-6">
          {id ? 'Update Profile' : 'Create Profile'}
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              name="dob"
              type="date"
              value={profile.dob}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-gray-500 mt-1">Current value: {profile.dob}</p>
          </div>
          
          <div>
            <Label htmlFor="customInstructions">Custom Instructions</Label>
            <Textarea
              id="customInstructions"
              name="customInstructions"
              value={profile.customInstructions}
              onChange={handleChange}
              rows={6}
              placeholder="Enter any special instructions or information about this child..."
            />
            <p className="text-sm text-gray-500 mt-1">
              For example: "James loves dinosaurs and space. He knows a lot about planets."
            </p>
          </div>
          
          <div className="pt-4 flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => navigate('/parent-dashboard')}
            >
              Cancel
            </Button>
            <Button type="submit">
              {id ? 'Update Profile' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UpdateProfile;
