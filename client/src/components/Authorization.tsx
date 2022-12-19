import { Button } from '@mui/material';

export function Authorization() {
  const login = () => {
    window.open('https://statz-api.onrender.com/auth/strava', '_self');
  };
  return (
    <Button onClick={login} variant="outlined">
      <img alt="authorize" src="/btn_strava_auth.png" />
    </Button>
  );
}
