#!/usr/bin/perl -w
use strict;
use Chart::Gnuplot;

# Create the chart object
my $chart = Chart::Gnuplot->new(
    output => "rectangle_1.png",
    title  => "Draw two rectangles",
);

# Draw a rectangle
$chart->rectangle(
    from => "-5, -0.2",
    to   => "3, 0.4",
);

# Draw another rectangle
$chart->rectangle(
    center => "5, -0.5",
    width  => 2,
    height => 0.4,
);

# Data set object
my $dataSet = Chart::Gnuplot::DataSet->new(
    func => "sin(x)",
);

# Plot the graph
$chart->plot2d($dataSet);
