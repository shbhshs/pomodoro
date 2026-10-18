import { render, screen } from '@testing-library/react-native';

import App from '../App';

describe('App', () => {
  it('shows a 25 minute focus session', async () => {
    await render(<App />);
    expect(screen.getByLabelText('time remaining')).toHaveTextContent('25:00');
  });
});
