import axios from 'axios';
import { Violation } from './Violation';

const BASE_URL = 'http://localhost:8081/api/violations';

export const fetchViolations = async (): Promise<Violation[]> => {
  const res = await axios.get(BASE_URL);
  return res.data;
};

export const fetchViolationById = async (id: number): Promise<Violation> => {
  const res = await axios.get(`${BASE_URL}/${id}`);
  return res.data;
};

export const fetchViolationHistory = async (plate: string): Promise<Violation[]> => {
  const res = await axios.get(`${BASE_URL}/history/${plate}`);
  return res.data;
};