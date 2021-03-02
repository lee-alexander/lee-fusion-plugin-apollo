/* eslint-env browser */
import ReactDOM from 'react-dom';
import {ReactElement} from 'react';

export default (root: ReactElement) => {
  const domElement = document.getElementById('root');

  if (!domElement) {
    throw new Error("Could not find 'root' element");
  }

  ReactDOM.hydrate
    ? ReactDOM.hydrate(root, domElement)
    : ReactDOM.render(root, domElement);
};
