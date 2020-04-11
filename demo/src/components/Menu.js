import React from 'react';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    height: props => `${props.maxHeight - 20}px`,
    overflowY: 'auto'
  },
  paper: {
    flexGrow: 1,
    padding: theme.spacing(2),
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 2
  },
  item: {
    width: '100%'
  }
}));

function Menu({ children, ...props }) {
  const classes = useStyles(props);
  return (
    <Box
      position="absolute"
      right={0}
      top={0}
      width="350px"
      m={1}
      className={classes.root}
    >
      <Paper className={classes.paper}>
        <Grid
          container
          direction="column"
          spacing={1}
          justify="center"
          alignItems="center"
        >
          {children.map((child, i) => {
            return (
              // eslint-disable-next-line react/no-array-index-key
              <Grid item key={i} className={classes.item}>
                {child}
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}

export default Menu;
