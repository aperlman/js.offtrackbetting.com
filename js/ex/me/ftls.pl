#!/usr/bin/perl

use warnings;
use strict;

use constant DBD => 'DBI:mysql:otb:db.offtrackbetting.com';
use constant DBU => 'otb';
use constant DBP => 'Tvk4M^s!opLtB';

use Chart::Gnuplot;
use DBI;

my @months = qw/Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec/;

my $dbh = DBI->connect(DBD, DBU, DBP) or die "db error: ", $DBI::errstr;

my $sth = $dbh->prepare(qq|SELECT signup_date, DATE_FORMAT(signup_date, "%m/%y") AS dd, COUNT(id)
		 	    FROM customer
			     WHERE signup_date > "2011-08-01"
			     GROUP BY DATE_FORMAT(signup_date, "%y%m")
			      ORDER BY signup_date
			       |);
   $sth->execute();

my @values;
while (my ($date, $ddate, $count) = $sth->fetchrow_array) {
            push (@values, [$ddate, $count]);
}

$dbh->disconnect;

# fix the data
my @data;
{
   my $ph; # place holder
   my $row_data = [];

  # my ($disp_date, $count) = @{pop(@values)};
  # warn "DISP DATE: $disp_date COUNT: $count\n";
  # warn "Today: ", (localtime)[3], "\n";
   for (@values) {
       $row_data = $_;
       if (defined $ph && $ph > 0 && $ph != $_->[1]) {
	  $ph = int(($ph / 30) * (localtime)[3]) if ($_->[0] eq $values[$#values]->[0]);
	  my $chg = sprintf('%5.1f%%', (abs($_->[1] - $ph) / $ph) * 100);
	     $chg =~ s/\s+//g;
	     $chg = ($ph > $_->[1]) ? '('.$chg.')' : $chg;
          push(@$row_data, $chg);
       }
       $ph = $_->[1];
       push(@data, $row_data);
   }
}

my (@x, @this_year, @last_year);
for (my $i = 0; $i < 12; $i++) {
    my $idx = $#data - $i;
    unshift(@x,         $data[$idx]->[0]); #gather the date
    unshift(@this_year, $data[$idx]->[1]);
    if ($idx < 12) {
       unshift (@last_year, 0);
    }else{
       unshift(@last_year, $data[$idx - 12]->[1]);
    }
}
 
my $text;
{
  my $counter = 0;
  for (reverse @data) {
      last if ++$counter > 4;
      #$text .= join '\\t', @$_, '\\n';
      my ($m) = ($_->[0] =~ /^(\d+)/);
      $text .= $months[$m - 1]. '\\t';
      $text .= length($_->[1]) < 4 ? ' '.$_->[1] : $_->[1];
      $text .= ' \\t'. $_->[2]. '\\n';
  }
}
 
# Create the chart object
my $chart = Chart::Gnuplot->new(
    title    => {
	text => 'FTLs',
	#yrange => [0,"*"],
	#color => '#FFE4E1'
	color => '#4A9199',
	offset => '8, -2',
        font      => 'Helvetica Bold Oblique, 32',
    },
    border => {
	sides => 'left, right',
	#color => '#505050'
	#color => '#133967'
	color => '#174077',
    },
    ylabel => {
	text   => 'users',
	offset => '2.1, 2.1',
        font   => 'Helvetica Bold Oblique, 10',
	#color => '#F5F5F5',
	color => '#174077',
    },
    output   => 'datetime.png',
    xlabel   => {
	text => 'month',
	offset => "1.4, 1.4",
        font      => 'Helvetica Bold Oblique, 10',
	#color => '#F5F5F5'
	color => '#174077'
    },
    imagesize => '0.8,0.5',
    xtics  => {
	labelfmt => '%b %y',
	rotate => -45,
	#fontcolor => '#A0A0A0',
	fontcolor => '#174077',
        font      => 'Helvetica Bold Oblique, 10',
#	length => "5,3",
	minor  => 1,
    },
    grid    => {
	linetype => 'longdash, dot-longdash',
	#color    => '#11263C',
	color => '#245B81',
	width    => '3, 1',
	xlines   => 'off, on',
    },
    boxwidth => .85 / 2 .' relative',
    timeaxis => "x",            # declare that x-axis uses time format
);

$chart->label(
    position  => 'graph 0.05, graph 0.7',
    text      => $text,
    layer     => 'front',
    font      => 'courier bold, 20',
    fontcolor => '#245B81',
    rotate    => 20
);

use Data::Dumper;
warn "Dumper: ", Dumper(\@x);
warn "Y:      ", Dumper(\@this_year);
warn "Y2:     ", Dumper(\@last_year);

# Data set object
my $current_year_data = Chart::Gnuplot::DataSet->new(
    xdata     => \@x,
    ydata     => \@this_year,
    fill      => { density => 1 },
    color     => '#4A9199',
    style     => 'boxes',
    fill  => {density => 0.8},
    width     => 3,
    using => '1:2:(60 * 60 * 24 * 7)',
    timefmt   => '%m/%Y',      # input time format
);

my $previous_year_data = Chart::Gnuplot::DataSet->new(
    xdata  => \@x,
    ydata  => \@last_year,
    fill   => { density => 0.6 },
    border => 5,
    color  => '#4A9199',
    style  => 'boxes',
    using  => '1:2:(60 * 60 * 24 * 7 * 3)',
    timefmt  => '%m/%Y',
);

# Plot the graph
$chart->plot2d($previous_year_data, $current_year_data);
#$chart->plot2d($current_year_data);
