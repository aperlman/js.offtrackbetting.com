#!/usr/bin/env perl

#use Modern::Perl;
use DateTime;
use Chart::Gnuplot;

my @x_vals = qw/
    2012-11-07
    2012-11-08
    2012-11-15
    2012-11-19
    2012-11-30
/;

my @y_vals = (
    11, 12, 13, 14, 15,
);

my $chart = Chart::Gnuplot->new(
    output   => 'plot.png',
    title    => 'plot title',
    xlabel   => 'x label',
    ylabel   => 'y label',
    timeaxis => 'x',
    xtics    => {
        labelfmt => '%Y-%m-%d',
        rotate   => -90,
    },
);

my $dataset = Chart::Gnuplot::DataSet->new(
    xdata => \@x_vals,
    ydata => \@y_vals,
    title => 'data title',
    style => 'linespoints',
    timefmt => '%Y-%m-%d',
);

$chart->plot2d($dataset);
