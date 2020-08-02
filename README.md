# Irregular maze generator and solver
Irregular maze generator and solver using [a*](https://en.wikipedia.org/wiki/A*_search_algorithm).

# Website
https://gerizim16.github.io/maze/

# Generator
Uses poisson disk sampling to produce nodes. Nodes are then connected by [delaunay triangulation](https://en.wikipedia.org/wiki/Delaunay_triangulation). A perfect maze (one with only one solution) is made using the [Aldous-Broder maze generation algorithm](https://en.wikipedia.org/wiki/Maze_generation_algorithm#Aldous-Broder_algorithm). Finally, additional edges are randomly added to produce multiple possible solutions for the maze.

# Solver
The maze is solved by the [A* search algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm).
