import axios from 'axios';
import { Activity, Athlete } from '../models/Strava';

const BASE_URL = 'https://statz-api.onrender.com';

export const getAthlete = async (): Promise<Athlete> => {
  return axios.get(`${BASE_URL}/api/athlete`).then(({ data }) => data);
};

export const getActivities = async (): Promise<Activity[]> => {
  return axios.get(`${BASE_URL}/api/activities`).then(({ data }) => data);
};
