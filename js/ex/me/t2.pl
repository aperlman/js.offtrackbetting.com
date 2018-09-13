#!/usr/bin/perl -w
use strict;
use Chart::Gnuplot;

# Initiate the chart object
my $chart = Chart::Gnuplot->new(
    output => 'histo.png',
    yrange => [0, '*'],
    timeaxis => "x",
    #labelfmt => '%b %y',
);

# DataSet object of the 1st data set
# - Data input as "xdata" and "ydata"
#my @x = qw(A B C D E F);
my @x = qw|10/2011 11/2011 12/2011 1/2012 2/2012 3/2012|; 
my $h1 = Chart::Gnuplot::DataSet->new(
    xdata => \@x,
    ydata => [1, 8, 3, 2, 4, 4],
    title => "1st data set",
    style => "histograms",
    timefmt => '%m',
    using => '1:2'
);

# DataSet object of the 2nd data set
# - Fill the bars
my $h2 = Chart::Gnuplot::DataSet->new(
    xdata => \@x,
    ydata => [2, 2, 5, 1, 7, 6],
    title => "2nd data set",
    color => "dark-green",
    fill  => {density => 0.2},
    style => "histograms",
    timefmt => '%m',
    using => '1:3',
);

# DataSet object of the 3rd data set
# - Data input as "points"
my $h3 = Chart::Gnuplot::DataSet->new(
    points => [
        ['10/2011', 4],
        ['11/2011', 3],
        ['12/2011', 2],
        ['1/2012', 2],
        ['2/2012', 3],
        ['3/2012', 5],
    ],
    title => "3rd data set",
    style => "histograms",
    timefmt => '%m',
    using => '1:4',
);

# Plot the graph
$chart->plot2d($h1, $h2, $h3);
